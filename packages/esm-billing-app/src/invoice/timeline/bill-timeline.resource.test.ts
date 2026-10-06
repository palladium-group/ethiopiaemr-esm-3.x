import { MappedBill } from '../../types';
import { BillTimelineDetails, buildTimelineEvents, groupEventsByDay } from './bill-timeline.resource';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  parseDate: (value: string) => new Date(value),
}));

const bill = {
  uuid: 'bill-1',
  dateCreatedUnformatted: '2026-09-28T09:00:00.000Z',
  cashier: { display: 'Cashier One' },
  closed: true,
  dateClosed: '2026-10-01T12:20:00.000Z',
  closeReason: 'Visit checked out',
  payments: [
    {
      uuid: 'pay-1',
      voided: false,
      amountTendered: 40,
      dateCreated: '2026-10-01T12:16:00.000Z',
      instanceType: { name: 'Cash' },
    },
    {
      uuid: 'pay-2',
      voided: true,
      amountTendered: 99,
      dateCreated: '2026-10-01T12:17:00.000Z',
      instanceType: { name: 'Cash' },
    },
  ],
} as unknown as MappedBill;

const details: BillTimelineDetails = {
  uuid: 'bill-1',
  closedBy: { display: 'admin' },
  lineItems: [
    {
      uuid: 'li-2',
      billableService: 'uuid-2:Consultation',
      price: 40,
      quantity: 1,
      paymentStatus: 'PAID',
      auditInfo: { dateCreated: '2026-10-01T12:12:00.000Z', creator: { display: 'Dr Who' } },
    },
    {
      uuid: 'li-1',
      item: 'uuid-1:Paracetamol',
      price: 25,
      quantity: 2,
      paymentStatus: 'EXEMPTED',
      auditInfo: { dateCreated: '2026-09-28T09:05:00.000Z' },
    },
    {
      uuid: 'li-voided',
      billableService: 'uuid-3:Cancelled test',
      price: 10,
      quantity: 1,
      paymentStatus: 'PENDING',
      voided: true,
      auditInfo: { dateCreated: '2026-09-28T09:06:00.000Z' },
    },
  ],
};

describe('buildTimelineEvents', () => {
  it('lists the bill history oldest first', () => {
    const events = buildTimelineEvents(bill, details);

    expect(events.map((event) => event.id)).toEqual([
      'opened-bill-1',
      'item-li-1',
      'item-li-2',
      'payment-pay-1',
      'closed-bill-1',
    ]);
  });

  it('describes item, payment and close events', () => {
    const events = buildTimelineEvents(bill, details);
    const byId = Object.fromEntries(events.map((event) => [event.id, event]));

    expect(byId['opened-bill-1']).toMatchObject({ kind: 'opened', actor: 'Cashier One' });
    expect(byId['item-li-1']).toMatchObject({ kind: 'itemAdded', name: 'Paracetamol', amount: 50, status: 'EXEMPTED' });
    expect(byId['item-li-2']).toMatchObject({ name: 'Consultation', amount: 40, actor: 'Dr Who', status: 'PAID' });
    expect(byId['payment-pay-1']).toMatchObject({ kind: 'payment', amount: 40, detail: 'Cash' });
    expect(byId['closed-bill-1']).toMatchObject({ kind: 'closed', detail: 'Visit checked out', actor: 'admin' });
  });

  it('leaves out voided line items and voided payments', () => {
    const ids = buildTimelineEvents(bill, details).map((event) => event.id);

    expect(ids).not.toContain('item-li-voided');
    expect(ids).not.toContain('payment-pay-2');
  });

  it('has no close event while the bill is open', () => {
    const openBill = { ...bill, closed: false, dateClosed: undefined } as MappedBill;

    expect(buildTimelineEvents(openBill, details).some((event) => event.kind === 'closed')).toBe(false);
  });

  it('still lists the bill and its payments when the line item details are missing', () => {
    expect(buildTimelineEvents(bill).map((event) => event.kind)).toEqual(['opened', 'payment', 'closed']);
  });
});

describe('groupEventsByDay', () => {
  it('groups consecutive events that fall on the same day', () => {
    const groups = groupEventsByDay(buildTimelineEvents(bill, details));

    expect(groups.map((group) => group.events.length)).toEqual([2, 3]);
  });
});
