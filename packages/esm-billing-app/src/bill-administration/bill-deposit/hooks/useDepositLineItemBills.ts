import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type LineItem } from '../../../types';

type BillOfLineItem = { receiptNumber: string; closed: boolean; lineItemName: string };

/** The bill each of the patient's line items is on, so deposit transactions can name it and spot closed bills. */
export const useDepositLineItemBills = (patientUuid: string) => {
  const { data, isLoading } = useSWR<{
    data: { results: Array<{ receiptNumber: string; closed: boolean; lineItems: Array<LineItem> }> };
  }>(
    patientUuid
      ? `${restBaseUrl}/cashier/bill?patientUuid=${patientUuid}&v=custom:(receiptNumber,closed,lineItems)`
      : null,
    openmrsFetch,
  );

  const billsByLineItem = new Map<string, BillOfLineItem>();
  data?.data?.results?.forEach((bill) =>
    bill.lineItems?.forEach((lineItem) =>
      billsByLineItem.set(lineItem.uuid, {
        receiptNumber: bill.receiptNumber,
        closed: Boolean(bill.closed),
        lineItemName: lineItem.billableService?.split(':')[1] || lineItem.item?.split(':')[1] || '',
      }),
    ),
  );

  return { billsByLineItem, isLoading };
};
