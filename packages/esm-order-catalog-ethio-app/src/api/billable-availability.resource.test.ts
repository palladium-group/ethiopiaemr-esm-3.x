import {
  createBillableAvailabilityLookup,
  createBillablePriceLookup,
  type BillableServiceAvailability,
} from './billable-availability.resource';

describe('billable availability lookup', () => {
  it('maps concept uuid to enabled state', () => {
    const services: Array<BillableServiceAvailability> = [
      { serviceStatus: 'ENABLED', concept: { uuid: 'concept-a' } },
      { serviceStatus: 'DISABLED', concept: { uuid: 'concept-b' } },
    ];

    const lookup = createBillableAvailabilityLookup(services);

    expect(lookup.get('concept-a')).toBe(true);
    expect(lookup.get('concept-b')).toBe(false);
  });

  it('ignores services missing a concept uuid', () => {
    const services: Array<BillableServiceAvailability> = [
      { serviceStatus: 'DISABLED' },
      { serviceStatus: 'ENABLED', concept: { display: 'Missing uuid' } },
      { serviceStatus: 'ENABLED', concept: { uuid: 'valid-concept' } },
    ];

    const lookup = createBillableAvailabilityLookup(services);

    expect(lookup.has('valid-concept')).toBe(true);
    expect(lookup.size).toBe(1);
  });
});

describe('billable price lookup', () => {
  it('maps a concept to its payment-method prices', () => {
    const services: Array<BillableServiceAvailability> = [
      {
        serviceStatus: 'ENABLED',
        concept: { uuid: 'cbc' },
        servicePrices: [{ uuid: 'price-1', price: 1000, paymentMode: { name: 'Cash' } }],
      },
    ];

    const prices = createBillablePriceLookup(services);

    expect(prices.get('cbc')).toEqual([{ uuid: 'price-1', price: 1000, paymentModeName: 'Cash' }]);
  });

  it('stores an empty price list when a service has no prices', () => {
    const services: Array<BillableServiceAvailability> = [
      { serviceStatus: 'ENABLED', concept: { uuid: 'unpriced' }, servicePrices: [] },
    ];

    expect(createBillablePriceLookup(services).get('unpriced')).toEqual([]);
    expect(createBillablePriceLookup(services).has('missing')).toBe(false);
  });
});
