import { openmrsFetch, parseDate, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { MappedBill } from '../../types';
import { type BillDeposit } from '../../bill-administration/bill-deposit/types/bill-deposit.types';

export type TimelineEventKind = 'opened' | 'itemAdded' | 'payment' | 'depositApplied' | 'depositReversed' | 'closed';

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  date: Date;
  /** Item name for itemAdded and deposit events. */
  name?: string;
  /** Payment method for payments, deposit reference or reversal reason for deposits, close reason for closed. */
  detail?: string;
  /** The line items a payment was applied to. */
  items?: Array<string>;
  amount?: number;
  quantity?: number;
  price?: number;
  actor?: string;
  status?: string;
};

type AuditInfo = { dateCreated?: string; creator?: { display?: string } };

export type BillTimelineDetails = {
  uuid: string;
  closedBy?: { display?: string } | null;
  lineItems?: Array<{
    uuid: string;
    item?: string;
    billableService?: string;
    price: number;
    quantity: number;
    paymentStatus: string;
    voided?: boolean;
    auditInfo?: AuditInfo;
  }>;
};

// The line item resource ignores a custom field list, so line items are requested in full to get auditInfo
// (who added the item, and when).
const timelineRepresentation = 'custom:(uuid,closedBy:(display),lineItems:full)';

const toDate = (value?: string | number | null): Date | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return typeof value === 'number' ? new Date(value) : parseDate(value);
};

type DepositsForTimeline = Array<Pick<BillDeposit, 'uuid' | 'referenceNumber' | 'transactions'>>;

const lineItemName = (lineItem: { billableService?: string; item?: string }) =>
  lineItem.billableService?.split(':')[1] || lineItem.item?.split(':')[1] || '';

/**
 * Builds the bill's history, oldest first, from the bill itself, its line item audit details, and the patient's
 * deposit transactions applied to the bill's line items.
 */
export function buildTimelineEvents(
  bill: MappedBill,
  details?: BillTimelineDetails,
  deposits?: DepositsForTimeline,
): Array<TimelineEvent> {
  const events: Array<TimelineEvent> = [];
  if (!bill) {
    return events;
  }

  const namesByLineItem = new Map(
    (details?.lineItems ?? []).map((lineItem) => [lineItem.uuid, lineItemName(lineItem)]),
  );

  const opened = toDate(bill.dateCreatedUnformatted);
  if (opened) {
    events.push({ id: `opened-${bill.uuid}`, kind: 'opened', date: opened, actor: bill.cashier?.display });
  }

  details?.lineItems
    ?.filter((lineItem) => !lineItem.voided)
    .forEach((lineItem) => {
      const date = toDate(lineItem.auditInfo?.dateCreated);
      if (date) {
        events.push({
          id: `item-${lineItem.uuid}`,
          kind: 'itemAdded',
          date,
          name: lineItemName(lineItem),
          amount: lineItem.price * lineItem.quantity,
          quantity: lineItem.quantity,
          price: lineItem.price,
          actor: lineItem.auditInfo?.creator?.display,
          status: lineItem.paymentStatus,
        });
      }
    });

  bill.payments
    ?.filter((payment) => !payment.voided)
    .forEach((payment) => {
      const date = toDate(payment.dateCreated);
      if (date) {
        events.push({
          id: `payment-${payment.uuid}`,
          kind: 'payment',
          date,
          detail: payment.instanceType?.name,
          items: (payment.allocations ?? [])
            .map((allocation) => namesByLineItem.get(allocation.lineItem))
            .filter(Boolean),
          amount: payment.amountTendered,
          actor: payment.cashierName,
        });
      }
    });

  deposits?.forEach((deposit) =>
    deposit.transactions
      ?.filter((transaction) => transaction.transactionType === 'APPLY')
      .filter((transaction) => namesByLineItem.has(transaction.billLineItem?.uuid))
      .forEach((transaction) => {
        const name = namesByLineItem.get(transaction.billLineItem.uuid);
        const applied = toDate(transaction.dateCreated);
        if (applied) {
          events.push({
            id: `deposit-applied-${transaction.uuid}`,
            kind: 'depositApplied',
            date: applied,
            name,
            detail: deposit.referenceNumber,
            amount: transaction.amount,
            actor: transaction.auditInfo?.creator?.display,
          });
        }
        const reversed = toDate(transaction.auditInfo?.dateVoided ?? transaction.auditInfo?.dateChanged);
        if (transaction.voided && reversed) {
          events.push({
            id: `deposit-reversed-${transaction.uuid}`,
            kind: 'depositReversed',
            date: reversed,
            name,
            detail: transaction.auditInfo?.voidReason ?? undefined,
            amount: transaction.amount,
            actor: transaction.auditInfo?.voidedBy?.display,
          });
        }
      }),
  );

  const closed = toDate(bill.dateClosed);
  if (bill.closed && closed) {
    events.push({
      id: `closed-${bill.uuid}`,
      kind: 'closed',
      date: closed,
      detail: bill.closeReason,
      actor: details?.closedBy?.display,
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Groups events by calendar day, keeping their order. */
export function groupEventsByDay(events: Array<TimelineEvent>) {
  const groups: Array<{ day: string; date: Date; events: Array<TimelineEvent> }> = [];
  events.forEach((event) => {
    const day = event.date.toDateString();
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.events.push(event);
    } else {
      groups.push({ day, date: event.date, events: [event] });
    }
  });
  return groups;
}

export function useBillTimeline(bill: MappedBill) {
  const { data, isLoading, error } = useSWR<{ data: BillTimelineDetails }>(
    bill?.uuid ? `${restBaseUrl}/cashier/bill/${bill.uuid}?v=${timelineRepresentation}` : null,
    openmrsFetch,
  );
  // Deposits belong to the patient, not the bill; their transactions name the line item they were applied to.
  const { data: depositData, isLoading: isLoadingDeposits } = useSWR<{ data: { results: DepositsForTimeline } }>(
    bill?.patientUuid
      ? `${restBaseUrl}/cashier/deposit?patient=${bill.patientUuid}&v=custom:(uuid,referenceNumber,transactions:full)`
      : null,
    openmrsFetch,
  );

  return {
    events: data?.data ? buildTimelineEvents(bill, data.data, depositData?.data?.results) : [],
    isLoading: isLoading || isLoadingDeposits,
    error,
  };
}
