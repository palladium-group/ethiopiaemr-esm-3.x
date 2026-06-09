import { getAppointmentSummaryUrl, parseAppointmentSummariesResponse } from './quota.resource';

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
