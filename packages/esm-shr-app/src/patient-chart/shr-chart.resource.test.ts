import { parsePendingRequests, readRefusal } from './shr-chart.resource';

const refused = (status: number, code?: string, body?: unknown) => ({
  response: { status },
  responseBody:
    body !== undefined ? body : { resourceType: 'OperationOutcome', issue: [{ details: code ? { text: code } : {} }] },
});

describe('readRefusal', () => {
  it('reads the code from an OperationOutcome, whoever refused', () => {
    expect(readRefusal(refused(409, 'no-active-visit'))).toEqual({ code: 'no-active-visit', status: 409 });
    expect(readRefusal(refused(403, 'consent-required'))).toEqual({ code: 'consent-required', status: 403 });
    expect(readRefusal(refused(404, 'patient-not-found'))).toEqual({ code: 'patient-not-found', status: 404 });
  });

  it('treats a gateway page or a network failure as the SHR being unreachable', () => {
    expect(readRefusal(refused(502, undefined, '<html>Bad gateway</html>'))).toEqual({
      code: 'shr-unreachable',
      status: 502,
    });
    expect(readRefusal(new Error('Failed to fetch'))).toEqual({ code: 'shr-unreachable', status: null });
  });

  it('does not invent a reason for an unexplained client error', () => {
    expect(readRefusal(refused(400, undefined, null))).toEqual({ code: 'unknown', status: 400 });
  });
});

describe('parsePendingRequests', () => {
  const input = (code: string, value: Record<string, unknown>) => ({
    type: { coding: [{ system: 'https://fhir.moh.gov.et/CodeSystem/shr-consent-request', code }] },
    ...value,
  });

  it('reads each waiting request: when, until when, and for which record types', () => {
    const pending = parsePendingRequests({
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Task',
            id: '1041',
            status: 'requested',
            authoredOn: '2026-10-14T07:24:45+00:00',
            restriction: { period: { end: '2026-10-21T07:24:45+00:00' } },
            input: [
              input('resource-type', { valueString: 'Condition' }),
              input('resource-type', { valueString: 'MedicationRequest' }),
              input('purpose', { valueString: 'TREAT' }),
              input('access-days', { valueInteger: 30 }),
            ],
          },
        },
      ],
    });
    expect(pending).toEqual([
      {
        id: '1041',
        authoredOn: '2026-10-14T07:24:45+00:00',
        expires: '2026-10-21T07:24:45+00:00',
        resourceTypes: ['Condition', 'MedicationRequest'],
      },
    ]);
  });

  it('is empty when nothing is waiting or the list could not be read', () => {
    expect(parsePendingRequests({ resourceType: 'Bundle', total: 0 })).toEqual([]);
    expect(parsePendingRequests(undefined)).toEqual([]);
  });
});
