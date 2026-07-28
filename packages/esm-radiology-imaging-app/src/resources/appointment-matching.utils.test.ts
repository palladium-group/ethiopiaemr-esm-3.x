import {
  findNewAppointments,
  pickAppointmentForModality,
  selectNewAppointmentForOrder,
} from './appointment-matching.utils';

describe('findNewAppointments', () => {
  it('returns appointments that were not present before scheduling', () => {
    const before = [{ uuid: 'existing', startDateTime: null }];
    const after = [
      { uuid: 'existing', startDateTime: null },
      { uuid: 'new', startDateTime: Date.parse('2026-07-21T12:00:00.000Z') },
    ];

    expect(findNewAppointments(before, after)).toEqual([after[1]]);
  });

  it('returns an empty array when nothing new was created (workspace opened but cancelled)', () => {
    const before = [{ uuid: 'existing', startDateTime: null }];
    const after = [{ uuid: 'existing', startDateTime: null }];

    expect(findNewAppointments(before, after)).toEqual([]);
  });
});

describe('pickAppointmentForModality', () => {
  it('returns null when there are no appointments', () => {
    expect(pickAppointmentForModality([], 'CT')).toBeNull();
  });

  it('prefers the appointment whose service matches the modality', () => {
    const result = pickAppointmentForModality(
      [
        {
          uuid: 'general',
          startDateTime: Date.parse('2026-07-21T11:00:00.000Z'),
          service: { name: 'General Clinic', uuid: 's1' },
        },
        {
          uuid: 'ct-service',
          startDateTime: Date.parse('2026-07-21T12:00:00.000Z'),
          service: { name: 'CT Imaging', uuid: 's2' },
        },
      ],
      'CT',
    );

    expect(result?.uuid).toBe('ct-service');
  });
});

describe('selectNewAppointmentForOrder', () => {
  it('only matches genuinely new appointments, never pre-existing ones', () => {
    const before = [
      {
        uuid: 'pre-existing',
        startDateTime: Date.parse('2026-07-21T09:00:00.000Z'),
        service: { name: 'CT Imaging', uuid: 's2' },
      },
    ];

    // Workspace opened but nothing saved: after === before.
    expect(selectNewAppointmentForOrder(before, before, 'CT')).toBeNull();
  });

  it('selects the newly created appointment matching the modality', () => {
    const before = [{ uuid: 'existing', startDateTime: null }];
    const after = [
      { uuid: 'existing', startDateTime: null },
      {
        uuid: 'new-appointment',
        startDateTime: Date.parse('2026-07-21T14:00:00.000Z'),
        dateAppointmentScheduled: Date.parse('2026-07-21T10:05:00.000Z'),
        service: { name: 'CT Imaging', uuid: 's2' },
      },
    ];

    const result = selectNewAppointmentForOrder(before, after, 'CT');

    expect(result?.uuid).toBe('new-appointment');
  });
});
