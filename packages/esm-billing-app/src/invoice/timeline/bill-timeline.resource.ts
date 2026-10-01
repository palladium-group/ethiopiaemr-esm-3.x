import { openmrsFetch, parseDate, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { MappedBill } from '../../types';

export type TimelineEventKind = 'opened' | 'itemAdded' | 'payment' | 'closed';

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  date: Date;
  /** Item name for itemAdded events. */
  name?: string;
  /** Payment method for payments, close reason for closed. */
  detail?: string;
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

/** Builds the bill's history, oldest first, from the bill itself and its line item audit details. */
export function buildTimelineEvents(bill: MappedBill, details?: BillTimelineDetails): Array<TimelineEvent> {
  const events: Array<TimelineEvent> = [];
  if (!bill) {
    return events;
  }

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
          name: lineItem.billableService?.split(':')[1] || lineItem.item?.split(':')[1] || '',
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
          amount: payment.amountTendered,
        });
      }
    });

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

  return {
    events: data?.data ? buildTimelineEvents(bill, data.data) : [],
    isLoading,
    error,
  };
}
