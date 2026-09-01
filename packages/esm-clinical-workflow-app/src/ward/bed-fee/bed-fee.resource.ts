import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface ServicePrice {
  uuid: string;
  name: string;
  price: number;
  paymentMode?: {
    uuid: string;
    name: string;
  };
}

export interface BillableService {
  uuid: string;
  name: string;
  shortName?: string;
  serviceStatus?: string;
  concept?: {
    uuid: string;
    display?: string;
  };
  servicePrices: Array<ServicePrice>;
}

const billableServicesRep =
  'custom:(uuid,name,shortName,serviceStatus,concept:(uuid,display),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))';

/**
 * Billable services this facility can charge. The liaison picks the bed fee service from this list,
 * so nothing has to be configured per facility.
 */
export function useBedFeeBillableServices() {
  const url = `${restBaseUrl}/cashier/billableService?v=${billableServicesRep}`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<BillableService> }>>(url, openmrsFetch);

  const billableServices = (data?.data?.results ?? []).filter((service) => service.serviceStatus !== 'DISABLED');

  return {
    billableServices,
    isLoadingBillableServices: isLoading,
    errorFetchingBillableServices: error,
  };
}

export interface BedFeeBillPayload {
  patientUuid: string;
  cashPointUuid: string;
  cashierUuid?: string;
  billableServiceUuid: string;
  priceUuid: string;
  priceName: string;
  price: number;
  quantity: number;
}

export function createBedFeeBill(payload: BedFeeBillPayload) {
  return openmrsFetch(`${restBaseUrl}/cashier/bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      patient: payload.patientUuid,
      cashPoint: payload.cashPointUuid,
      ...(payload.cashierUuid ? { cashier: payload.cashierUuid } : {}),
      status: 'PENDING',
      payments: [],
      lineItems: [
        {
          billableService: payload.billableServiceUuid,
          quantity: payload.quantity,
          price: payload.price,
          priceName: payload.priceName || 'Default',
          priceUuid: payload.priceUuid,
          lineItemOrder: 0,
          paymentStatus: 'PENDING',
        },
      ],
    },
  });
}
