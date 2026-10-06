import { BillingService, LineItem } from '../../types';
import { buildPaymentGroups, isPayable, resolveLineItemMethod } from './checkout.resource';

const cash = { uuid: 'cash', name: 'Cash' };
const cbhi = { uuid: 'cbhi', name: 'CBHI' };

const services = [
  {
    uuid: 'consultation',
    servicePrices: [
      { paymentMode: cbhi, price: 0 },
      { paymentMode: cash, price: 40 },
    ],
  },
  { uuid: 'scan', servicePrices: [{ paymentMode: cbhi, price: 100 }] },
  { uuid: 'unpriced', servicePrices: [] },
] as unknown as Array<BillingService>;

const line = (uuid: string, service: string, price: number, quantity = 1, paymentStatus = 'PENDING') =>
  ({ uuid, billableService: `${service}:${service}`, price, quantity, paymentStatus } as unknown as LineItem);

describe('resolveLineItemMethod', () => {
  it("prefers the price configured for the visit's payment method", () => {
    expect(resolveLineItemMethod(line('l1', 'consultation', 40), services, 'cash')).toEqual(cash);
  });

  it("falls back to the service's first configured price when it has none for the visit's method", () => {
    expect(resolveLineItemMethod(line('l2', 'scan', 100), services, 'cash')).toEqual(cbhi);
  });

  it('uses the first configured price when the visit has no payment method', () => {
    expect(resolveLineItemMethod(line('l1', 'consultation', 40), services, undefined)).toEqual(cbhi);
  });

  it('returns null when the service has no configured price or is unknown', () => {
    expect(resolveLineItemMethod(line('l3', 'unpriced', 10), services, 'cash')).toBeNull();
    expect(resolveLineItemMethod(line('l4', 'missing', 10), services, 'cash')).toBeNull();
  });
});

describe('buildPaymentGroups', () => {
  const methodOf = (lineItem: LineItem) => resolveLineItemMethod(lineItem, services, 'cash');

  it('totals the line items per payment method using the price on the bill', () => {
    const groups = buildPaymentGroups(
      [line('l1', 'consultation', 40), line('l2', 'scan', 100), line('l5', 'consultation', 15, 2)],
      methodOf,
    );

    expect(groups.map((group) => [group.methodUuid, group.amount])).toEqual([
      ['cash', 70],
      ['cbhi', 100],
    ]);
    expect(groups[0].lineItems.map((lineItem) => lineItem.uuid)).toEqual(['l1', 'l5']);
  });

  it('groups items without a configured price under a null method', () => {
    const groups = buildPaymentGroups([line('l3', 'unpriced', 10)], methodOf);

    expect(groups).toEqual([expect.objectContaining({ methodUuid: null, amount: 10 })]);
  });
});

describe('isPayable', () => {
  it('excludes paid and exempted line items', () => {
    expect(isPayable(line('l1', 'consultation', 40))).toBe(true);
    expect(isPayable(line('l1', 'consultation', 40, 1, 'PAID'))).toBe(false);
    expect(isPayable(line('l1', 'consultation', 40, 1, 'EXEMPTED'))).toBe(false);
  });
});
