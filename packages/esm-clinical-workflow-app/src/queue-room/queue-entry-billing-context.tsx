import React, { createContext, useContext } from 'react';
import type { QueueEntry } from '../types';
import { useQueueEntryBillingStatus, type QueueEntryBillingStatus } from './useQueueEntryBillingStatus';

export const QueueEntryBillingContext = createContext<QueueEntryBillingStatus | null>(null);

/**
 * Returns the pre-computed billing status provided by the nearest QueueEntryBillingRowProvider.
 * If not inside a provider, returns null.
 */
export function useQueueEntryBillingContext(): QueueEntryBillingStatus | null {
  return useContext(QueueEntryBillingContext);
}

/**
 * Evaluates `useQueueEntryBillingStatus` once at the row level and shares the result
 * with all cells in the row (e.g. QueuePatientNameCell and QueueTableActionsColumn),
 * eliminating redundant hook evaluations and duplicate SWR subscriptions per row.
 */
export const QueueEntryBillingRowProvider: React.FC<{
  queueEntry: QueueEntry | null | undefined;
  children: React.ReactNode;
}> = ({ queueEntry, children }) => {
  const billingStatus = useQueueEntryBillingStatus(queueEntry);

  return <QueueEntryBillingContext.Provider value={billingStatus}>{children}</QueueEntryBillingContext.Provider>;
};
