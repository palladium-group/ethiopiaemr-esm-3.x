import {
  formatDate,
  openmrsFetch,
  OpenmrsResource,
  parseDate,
  restBaseUrl,
  useConfig,
  useOpenmrsFetchAll,
  useSession,
  useVisit,
} from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import isEmpty from 'lodash-es/isEmpty';
import sortBy from 'lodash-es/sortBy';
import { useState } from 'react';
import useSWR from 'swr';
import { z } from 'zod';
import { BillingConfig } from './config-schema';
import { extractString } from './helpers';
import { FacilityDetail, MappedBill, PatientInvoice, PaymentMethod, PaymentStatus } from './types';

export const mapBillProperties = (bill: PatientInvoice): MappedBill => {
  // create base object
  const mappedBill: MappedBill = {
    id: bill?.id,
    uuid: bill?.uuid,
    patientName: bill?.patient?.display.split('-')?.[1],
    identifier: bill?.patient?.display.split('-')?.[0],
    patientUuid: bill?.patient?.uuid,
    status: bill?.lineItems.some((item) => item?.paymentStatus === PaymentStatus.PENDING)
      ? PaymentStatus.PENDING
      : bill?.status ?? PaymentStatus.PAID,
    receiptNumber: bill?.receiptNumber,
    cashier: bill?.cashier,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    dateCreated: bill?.dateCreated ? formatDate(parseDate(bill?.dateCreated), { mode: 'wide' }) : '--',
    dateCreatedUnformatted: bill?.dateCreated,
    visitStartDatetime: bill?.visit?.startDatetime
      ? formatDate(parseDate(bill.visit.startDatetime), { mode: 'wide' })
      : undefined,
    lineItems: bill?.lineItems.filter((li) => !li?.voided),
    billingService: extractString(
      bill?.lineItems.map((bill) => bill?.item || bill?.billableService || '--').join('  '),
    ),
    payments: bill?.payments,
    display: bill?.display,
    totalAmount: bill?.lineItems?.map((item) => item?.price * item?.quantity).reduce((prev, curr) => prev + curr, 0),
    tenderedAmount: bill?.payments?.map((item) => item?.amountTendered).reduce((prev, curr) => prev + curr, 0),
    referenceCodes: bill?.payments
      ?.map((payment) =>
        payment.attributes
          .filter((attr) => attr.attributeType.description === 'Reference Number')
          .map((attr) => {
            return {
              paymentMode: payment.instanceType.name,
              value: attr.value,
            };
          }),
      )
      .flat()
      .map((ref) => `${ref.paymentMode}: ${ref.value}`)
      .join(', '),
    adjustmentReason: bill?.adjustmentReason,
    balance: bill?.balance,
    totalPayments: bill?.totalPayments,
    totalDeposits: bill?.totalDeposits,
    totalExempted: bill?.totalExempted,
    closed: bill?.closed,
    closeReason: bill?.closeReason,
    dateClosed: bill?.dateClosed,
  };

  return mappedBill;
};

export const useBills = (
  patientUuid: string = '',
  billStatus: PaymentStatus.PENDING | '' | string = '',
  startingDate: Date = dayjs().startOf('day').toDate(),
  endDate: Date = dayjs().endOf('day').toDate(),
) => {
  // The server widens both bounds to whole days, so send plain local calendar dates. Sending UTC instants
  // (toISOString) shifts the window back a day for clients east of UTC.
  const fromDate = dayjs(startingDate).format('YYYY-MM-DD');
  const toDate = dayjs(endDate).format('YYYY-MM-DD');

  const url = `${restBaseUrl}/cashier/bill?status=${billStatus}&v=custom:(uuid,display,status,voided,voidReason,adjustedBy,cashPoint:(uuid,name),cashier:(uuid,display),dateCreated,lineItems,payments,patient:(uuid,display))&createdOnOrAfter=${fromDate}&createdOnOrBefore=${toDate}`;

  // The endpoint is paginated; fetch every page so totals and lists are not cut off at the first page.
  const {
    data: results,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useOpenmrsFetchAll<PatientInvoice>(patientUuid ? `${url}&patientUuid=${patientUuid}` : url, {
    swrInfiniteConfig: { errorRetryCount: 2 },
  });

  const sortBills = sortBy(results ?? [], ['dateCreated']).reverse();
  const filteredBills = billStatus === '' ? sortBills : sortBills?.filter((bill) => bill?.status === billStatus);
  const mappedResults = filteredBills?.map((bill) => mapBillProperties(bill));
  const filteredResults = mappedResults?.filter((res) => res.patientUuid === patientUuid);
  const formattedBills = isEmpty(patientUuid) ? mappedResults : filteredResults || [];

  return {
    bills: formattedBills,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

type UsePagedBillsParams = {
  billStatus?: PaymentStatus | '' | string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  startingDate?: Date;
  endDate?: Date;
};

/**
 * Fetches one page of bills created in the given window (today by default), letting the server do the
 * filtering, searching (patient name / identifier) and paging so that no bills are silently dropped.
 */
export const usePagedBills = ({
  billStatus = '',
  searchTerm = '',
  page = 1,
  pageSize = 10,
  startingDate = dayjs().startOf('day').toDate(),
  endDate = dayjs().endOf('day').toDate(),
}: UsePagedBillsParams = {}) => {
  const startIndex = (page - 1) * pageSize;
  const trimmedSearch = searchTerm.trim();

  // The server widens both bounds to whole days, so send plain local calendar dates. Sending UTC instants
  // (toISOString) shifts the window back a day for clients east of UTC, pulling in yesterday's bills.
  const fromDate = dayjs(startingDate).format('YYYY-MM-DD');
  const toDate = dayjs(endDate).format('YYYY-MM-DD');

  // lineItems:full is needed for auditInfo.dateCreated; the line item resource ignores a custom field list.
  const url =
    `${restBaseUrl}/cashier/bill?status=${billStatus}` +
    `&v=custom:(uuid,display,status,closed,voided,voidReason,adjustedBy,cashPoint:(uuid,name),cashier:(uuid,display),dateCreated,lineItems:full,patient:(uuid,display),visit:(uuid,startDatetime))` +
    `&createdOnOrAfter=${fromDate}&createdOnOrBefore=${toDate}` +
    // Also match older bills that had line items added in the window (bills are reused across days).
    `&includeLineItemActivity=true` +
    `&startIndex=${startIndex}&limit=${pageSize}` +
    (trimmedSearch ? `&q=${encodeURIComponent(trimmedSearch)}` : '');

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    data: { results: Array<PatientInvoice>; totalCount?: number };
  }>(url, openmrsFetch, { errorRetryCount: 2, keepPreviousData: true });

  const results = data?.data?.results;

  return {
    bills: results?.map((bill) => mapBillProperties(bill)),
    totalCount: data?.data?.totalCount ?? results?.length ?? 0,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const useBill = (billUuid: string) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}?includeVoided=false`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: PatientInvoice }>(
    billUuid ? url : null,
    openmrsFetch,
    {
      errorRetryCount: 2,
    },
  );

  const mapBillProperties = (bill: PatientInvoice): MappedBill => {
    // create base object
    const mappedBill: MappedBill = {
      id: bill?.id,
      uuid: bill?.uuid,
      patientName: bill?.patient?.display.split('-')?.[1],
      identifier: bill?.patient?.display.split('-')?.[0],
      patientUuid: bill?.patient?.uuid,
      status:
        bill?.lineItems.length > 1
          ? bill?.lineItems.some((item) => item?.paymentStatus === PaymentStatus.PENDING)
            ? PaymentStatus.PENDING
            : bill?.status ?? PaymentStatus.PAID
          : bill?.status,
      receiptNumber: bill?.receiptNumber,
      cashier: bill?.cashier,
      cashPointUuid: bill?.cashPoint?.uuid,
      cashPointName: bill?.cashPoint?.name,
      cashPointLocation: bill?.cashPoint?.location?.display,
      dateCreated: bill?.dateCreated ?? '--',
      dateCreatedUnformatted: bill?.dateCreated,
      lineItems: bill?.lineItems,
      billingService: bill?.lineItems.map((bill) => bill?.item).join(' '),
      payments: bill?.payments,
      totalAmount: bill?.lineItems?.map((item) => item.price * item.quantity).reduce((prev, curr) => prev + curr, 0),
      tenderedAmount: bill?.payments?.map((item) => item.amountTendered).reduce((prev, curr) => prev + curr, 0),
      totalPayments: bill?.totalPayments,
      totalDeposits: bill?.totalDeposits,
      totalExempted: bill?.lineItems
        ?.filter((item) => item?.paymentStatus === PaymentStatus.EXEMPTED)
        ?.reduce((prev, curr) => prev + curr?.price * curr?.quantity, 0),
      balance: bill?.balance,
      closed: bill?.closed,
      closeReason: bill?.closeReason,
      dateClosed: bill?.dateClosed,
    };

    return mappedBill;
  };

  // filter out voided line items to prevent them from being included in the bill
  // TODO: add backend support for voided line items
  // https://thepalladiumgroup.atlassian.net/browse/KHP3-7068
  const filteredLineItems = data?.data?.lineItems?.filter((li) => !li?.voided) ?? [];
  const formattedBill = data?.data
    ? mapBillProperties({ ...data?.data, lineItems: filteredLineItems })
    : ({} as MappedBill);

  return {
    bill: formattedBill,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const processBillPayment = (payload, billUuid: string) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useDefaultFacility() {
  const { authenticated } = useSession();
  const url = '${restBaseUrl}/kenyaemr/default-facility';
  const { data, isLoading } = useSWR<{ data: FacilityDetail }>(authenticated ? url : null, openmrsFetch, {});
  return { data: data?.data, isLoading: isLoading };
}

export function useFetchSearchResults(searchVal, category) {
  let url = ``;
  if (category == 'Stock Item') {
    url = `${restBaseUrl}/stockmanagement/stockitem?v=default&limit=10&q=${searchVal}`;
  } else {
    url = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  }
  const { data, error, isLoading, isValidating } = useSWR(searchVal ? url : null, openmrsFetch, {});

  return { data: data?.data, error, isLoading: isLoading, isValidating };
}

export const usePatientPaymentInfo = (patientUuid: string) => {
  const { currentVisit } = useVisit(patientUuid);
  const attributes = currentVisit?.attributes ?? [];
  const paymentInformation = attributes
    .map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    }))
    .filter(({ name }) => name === 'Insurance scheme' || name === 'Policy Number');

  return paymentInformation;
};

export const processBillItems = (payload) => {
  const url = `${restBaseUrl}/cashier/bill`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const usePaymentModes = (excludeWaiver: boolean = true) => {
  const { excludedPaymentMode } = useConfig<BillingConfig>();
  const url = `${restBaseUrl}/cashier/paymentMode?v=full`;
  const { data, isLoading, error, mutate } = useSWR<{ data: { results: Array<PaymentMethod> } }>(url, openmrsFetch, {
    errorRetryCount: 2,
  });
  const allowedPaymentModes =
    excludedPaymentMode?.length > 0
      ? data?.data?.results.filter((mode) => !excludedPaymentMode.some((excluded) => excluded.uuid === mode.uuid)) ?? []
      : data?.data?.results ?? [];
  return {
    paymentModes: excludeWaiver ? allowedPaymentModes : data?.data?.results,
    isLoading,
    mutate,
    error,
  };
};

export const useBillableItems = () => {
  const url = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredItems =
    data?.data?.results?.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ?? [];
  return {
    lineItems: filteredItems,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
  };
};
export const useCashPoint = () => {
  const url = `${restBaseUrl}/cashier/cashPoint`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, cashPoints: data?.data?.results ?? [] };
};

export const createPatientBill = (payload) => {
  const postUrl = `${restBaseUrl}/cashier/bill`;
  return openmrsFetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const useConceptAnswers = (conceptUuid: string) => {
  const url = `${restBaseUrl}/concept/${conceptUuid}`;
  const { data, isLoading, error } = useSWR<{ data: { answers: Array<OpenmrsResource> } }>(url, openmrsFetch);
  return { conceptAnswers: data?.data?.answers, isLoading, error };
};

export const billingFormSchema = z.object({
  cashPoint: z.string().uuid(),
  cashier: z.string().uuid(),
  patient: z.string().uuid(),
  payments: z.array(z.string()),
  status: z.enum(['PENDING']),
  lineItems: z
    .array(
      z.object({
        billableService: z.string().uuid(),
        quantity: z.number({ coerce: true }).min(1),
        price: z.number({ coerce: true }),
        priceName: z.string().optional().default('Default'),
        priceUuid: z.string().uuid(),
        lineItemOrder: z.number().optional().default(0),
        order: z.string().optional().default(''),
        paymentStatus: z.enum(['PENDING']),
      }),
    )
    .min(1),
});

export const addPaymentToBill = (billUuid: string, payload: Record<string, any>) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}/payment`;
  return openmrsFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};
