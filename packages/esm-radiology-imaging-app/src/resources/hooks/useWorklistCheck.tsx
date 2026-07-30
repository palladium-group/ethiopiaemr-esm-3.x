import useSWR from 'swr';
import { checkOrderHasWorklistEntry, type OrthancWorklistCheckResult } from '../pacs.resource';

export const worklistCheckKey = (orderNumber: string) => `worklist-check:${orderNumber}`;

export function useWorklistCheck(orderNumber: string) {
  return useSWR<OrthancWorklistCheckResult>(
    orderNumber ? worklistCheckKey(orderNumber) : null,
    () => checkOrderHasWorklistEntry(orderNumber),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
}
