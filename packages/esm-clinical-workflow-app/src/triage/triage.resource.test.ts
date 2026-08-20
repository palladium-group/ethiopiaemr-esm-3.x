import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';
import { buildTriageActiveVisitsUrl, createVisitForPatient, ensureTriageVisitAttribute } from './triage.resource';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;

const ATTRIBUTE_TYPE_UUID = 'c1f592f3-3c6e-44c9-ac2d-ddab90f705ba';

describe('buildTriageActiveVisitsUrl', () => {
  it('filters by location, attribute type, and triage id', () => {
    const url = buildTriageActiveVisitsUrl({
      sessionLocation: 'location-1',
      attributeTypeUuid: ATTRIBUTE_TYPE_UUID,
      triageId: 'adult',
      startIndex: 0,
      limit: 25,
    });

    expect(url).toContain(`${restBaseUrl}/ethiopiaemrcustommodule/visit?`);
    expect(url).toContain('includeInactive=false');
    expect(url).toContain('location=location-1');
    expect(url).toContain(`attributeType=${ATTRIBUTE_TYPE_UUID}`);
    expect(url).toContain('attributeValue=adult');
    expect(url).toContain('startIndex=0');
    expect(url).toContain('limit=25');
    expect(url).not.toContain('attributeValue=pediatric');
  });
});

describe('createVisitForPatient', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
    mockedOpenmrsFetch.mockResolvedValue({ ok: true, data: { uuid: 'visit-1' } } as never);
  });

  it('stores the triage id as a visit attribute', async () => {
    await createVisitForPatient('patient-1', 'visit-type-1', 'location-1', {
      attributeTypeUuid: ATTRIBUTE_TYPE_UUID,
      triageId: 'adult',
    });

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/visit?v=full`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          patient: 'patient-1',
          visitType: 'visit-type-1',
          location: 'location-1',
          attributes: [{ attributeType: ATTRIBUTE_TYPE_UUID, value: 'adult' }],
        }),
      }),
    );
  });
});

describe('ensureTriageVisitAttribute', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
    mockedOpenmrsFetch.mockResolvedValue({ ok: true } as never);
  });

  it('adds the triage attribute when the visit does not have one', async () => {
    const visit = { uuid: 'visit-1', attributes: [] } as unknown as Visit;

    await ensureTriageVisitAttribute(visit, ATTRIBUTE_TYPE_UUID, 'adult');

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/visit/visit-1`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          attributes: [{ attributeType: ATTRIBUTE_TYPE_UUID, value: 'adult' }],
        }),
      }),
    );
  });

  it('does not overwrite a visit that already belongs to another triage', async () => {
    const visit = {
      uuid: 'visit-1',
      attributes: [{ attributeType: { uuid: ATTRIBUTE_TYPE_UUID }, value: 'pediatric' }],
    } as unknown as Visit;

    await ensureTriageVisitAttribute(visit, ATTRIBUTE_TYPE_UUID, 'adult');

    expect(mockedOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('does not post when the visit already has this triage id', async () => {
    const visit = {
      uuid: 'visit-1',
      attributes: [{ attributeType: { uuid: ATTRIBUTE_TYPE_UUID }, value: 'adult' }],
    } as unknown as Visit;

    await ensureTriageVisitAttribute(visit, ATTRIBUTE_TYPE_UUID, 'adult');

    expect(mockedOpenmrsFetch).not.toHaveBeenCalled();
  });
});
