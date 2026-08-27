import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';
import {
  buildTriageAssignmentCountUrl,
  queueOptionLabel,
  setAssignedQueueVisitAttribute,
} from './triage-queue-assignment.resource';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
  useConfig: jest.fn(),
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;
const TRIAGE_ATTRIBUTE_TYPE_UUID = 'c1f592f3-3c6e-44c9-ac2d-ddab90f705ba';
const ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID = 'b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473';

describe('buildTriageAssignmentCountUrl', () => {
  it('filters today visits by triage type and assigned queue location', () => {
    const url = buildTriageAssignmentCountUrl({
      triageAttributeTypeUuid: TRIAGE_ATTRIBUTE_TYPE_UUID,
      triageId: 'pediatric',
      assignedQueueAttributeTypeUuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID,
      queueLocationUuid: 'general-opd',
      fromStartDate: '2026-08-27',
    });

    expect(url).toContain(`${restBaseUrl}/ethiopiaemrcustommodule/visit?`);
    expect(url).toContain('includeInactive=true');
    expect(url).toContain('totalCount=true');
    expect(url).toContain('fromStartDate=2026-08-27');
    expect(url).toContain(`attributeType=${TRIAGE_ATTRIBUTE_TYPE_UUID}`);
    expect(url).toContain('attributeValue=pediatric');
    expect(url).toContain(`attributeType=${ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID}`);
    expect(url).toContain('attributeValue=general-opd');
    expect(url).not.toContain('location=');
    expect(url).not.toContain('limit=');
  });
});

describe('queueOptionLabel', () => {
  it('appends the assignment count', () => {
    expect(queueOptionLabel('General OPD', 5)).toBe('General OPD 5');
    expect(queueOptionLabel('Emergency', undefined)).toBe('Emergency 0');
  });
});

describe('setAssignedQueueVisitAttribute', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
    mockedOpenmrsFetch.mockResolvedValue({ ok: true } as never);
  });

  it('adds the assigned queue location after a successful assignment', async () => {
    const visit = { uuid: 'visit-1', attributes: [] } as unknown as Visit;

    await setAssignedQueueVisitAttribute(visit, ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID, 'general-opd');

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/visit/visit-1`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          attributes: [{ attributeType: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID, value: 'general-opd' }],
        }),
      }),
    );
  });

  it('does not post when the visit already has this queue location', async () => {
    const visit = {
      uuid: 'visit-1',
      attributes: [
        { uuid: 'attr-1', attributeType: { uuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID }, value: 'general-opd' },
      ],
    } as unknown as Visit;

    await setAssignedQueueVisitAttribute(visit, ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID, 'general-opd');

    expect(mockedOpenmrsFetch).not.toHaveBeenCalled();
  });
});
