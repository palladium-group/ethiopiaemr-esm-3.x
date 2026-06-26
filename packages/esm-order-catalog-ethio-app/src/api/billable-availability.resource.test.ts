import { createBillableAvailabilityLookup, type BillableServiceAvailability } from './billable-availability.resource';

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
