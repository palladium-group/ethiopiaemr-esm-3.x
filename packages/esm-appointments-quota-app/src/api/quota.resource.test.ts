import {
  buildBlockDateTime,
  getAppointmentSummaryUrl,
  parseAppointmentSummariesResponse,
  parseServiceBlockLoad,
} from './quota.resource';

describe('parseAppointmentSummariesResponse', () => {
  it('returns an array when the payload is already an array', () => {
    const summaries = [{ appointmentService: { uuid: 'svc-1' }, appointmentCountMap: {} }];
    expect(parseAppointmentSummariesResponse(summaries)).toEqual(summaries);
  });

  it('unwraps results arrays', () => {
    const summaries = [{ appointmentService: { uuid: 'svc-1' }, appointmentCountMap: {} }];
    expect(parseAppointmentSummariesResponse({ results: summaries })).toEqual(summaries);
  });

  it('returns an empty array for error payloads', () => {
    expect(parseAppointmentSummariesResponse({ error: { message: 'bad date' } })).toEqual([]);
    expect(parseAppointmentSummariesResponse(null)).toEqual([]);
  });
});

describe('getAppointmentSummaryUrl', () => {
  it('uses Bahmni ISO date range instead of plain yyyy-mm-dd', () => {
    const url = getAppointmentSummaryUrl('2026-06-08', '2026-06-08');
    expect(url).toContain('startDate=2026-06-08T00%3A00%3A00');
    expect(url).toContain('endDate=2026-06-08T23%3A59%3A59');
    expect(url).not.toContain('startDate=2026-06-08&endDate=2026-06-08');
    expect(url).not.toContain('/ws/rest/v1/ws/rest/v1/');
    expect(url.startsWith('/ws/rest/v1/appointment/appointmentSummary')).toBe(true);
  });
});

describe('buildBlockDateTime', () => {
  it('formats block load datetimes as UTC without a timezone suffix', () => {
    const date = new Date(2026, 5, 10);
    const result = buildBlockDateTime(date, '09:00:00');

    expect(result).toBe('2026-06-10T09:00:00.000');
    expect(result).not.toMatch(/[+-]\d{2}:\d{2}$/);
    expect(result).not.toMatch(/Z$/);
  });

  it('parses HH:mm block times from weekly availability', () => {
    const date = new Date(2026, 5, 10);
    expect(buildBlockDateTime(date, '13:30')).toBe('2026-06-10T13:30:00.000');
  });
});

describe('parseServiceBlockLoad', () => {
  it('accepts numeric and numeric-string load responses', () => {
    expect(parseServiceBlockLoad(4)).toBe(4);
    expect(parseServiceBlockLoad('4')).toBe(4);
    expect(parseServiceBlockLoad('0')).toBe(0);
  });

  it('returns zero for invalid payloads', () => {
    expect(parseServiceBlockLoad(null)).toBe(0);
    expect(parseServiceBlockLoad({})).toBe(0);
    expect(parseServiceBlockLoad('not-a-number')).toBe(0);
  });
});
