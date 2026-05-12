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
  const startDate = dayjs().startOf('day').toDate();
  const endDate = dayjs().endOf('day').toDate();
  const url = `${restBaseUrl}/cashier/bill-summary?createdOnOrAfter=${startDate.toISOString()}&createdOnOrBefore=${endDate.toISOString()}`;
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
