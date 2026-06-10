import { deriveQuotaPropsFromFormProps, parseDateKey } from './quota-form-props.helper';

describe('deriveQuotaPropsFromFormProps', () => {
  it('returns empty props when appointment is missing', () => {
    expect(deriveQuotaPropsFromFormProps({ patientUuid: 'abc' })).toEqual({});
  });

  it('prefills service, date, and time from an edit-appointment payload', () => {
    const start = new Date(2026, 5, 8, 9, 30, 0);
    const end = new Date(2026, 5, 8, 10, 0, 0);

    expect(
      deriveQuotaPropsFromFormProps({
        patientUuid: 'patient-1',
        appointment: {
          service: { uuid: 'service-1' },
          startDateTime: start.getTime(),
          endDateTime: end.getTime(),
        },
      }),
    ).toEqual({
      serviceUuid: 'service-1',
      date: '2026-06-08',
      startTime: '09:30',
      endTime: '10:00',
    });
  });
});

describe('parseDateKey', () => {
  it('parses yyyy-mm-dd into a local date', () => {
    const date = parseDateKey('2026-06-08');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(8);
  });
});
