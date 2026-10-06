import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWRImmutable from 'swr/immutable';

export type BillSummary = {
  totalBills: number;
  pendingBills: number;
  paidBills: number;
  exemptedBills: number;
};
export const useBillSummary = () => {
  // Plain local dates and includeLineItemActivity keep the cards in step with the Today's Bills list.
  const today = dayjs().format('YYYY-MM-DD');
  const url = `${restBaseUrl}/cashier/bill-summary?createdOnOrAfter=${today}&createdOnOrBefore=${today}&includeLineItemActivity=true`;
  const { data, isLoading, isValidating, error, mutate } = useSWRImmutable<{ data: { results: Array<BillSummary> } }>(
    url,
    openmrsFetch,
    {
      errorRetryCount: 2,
    },
  );

  const defaultSummary: BillSummary = {
    totalBills: 0,
    pendingBills: 0,
    paidBills: 0,
    exemptedBills: 0,
  };
  const billSummary = data?.data?.results?.[0] ?? defaultSummary;

  return {
    data: billSummary,
    isLoading,
    isValidating,
    error,
    mutate,
  };
};
