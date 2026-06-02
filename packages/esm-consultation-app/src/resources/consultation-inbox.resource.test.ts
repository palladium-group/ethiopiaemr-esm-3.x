import { openmrsFetch } from '@openmrs/esm-framework';
import { CONSULTATION_ENCOUNTER_TYPE_UUID } from '../constants';
import { fetchConsultationsInbox, getConsultationsInboxFhirUrl } from './consultation-inbox.resource';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;

const locationUuid = '7cefec14-636c-47ea-ba6f-c74bd14edf64';
const encounterUuid = '8cee5826-561d-4adc-9e41-ee568a2fbfa9';
const conceptUuids = {
  reasonForConsultation: 'reason-uuid',
  pertinentInvestigation: 'investigation-uuid',
  briefHistory: 'history-uuid',
  consultingDepartment: 'consulting-dept-uuid',
  consultedDepartment: 'consulted-dept-uuid',
  typeOfConsultation: 'type-uuid',
  briefFinding: 'finding-uuid',
  recommendation: 'recommendation-uuid',
};

describe('consultation-inbox.resource', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  describe('getConsultationsInboxFhirUrl', () => {
    it('builds the expected FHIR encounter search URL', () => {
      const url = getConsultationsInboxFhirUrl('cardiology-location-uuid', CONSULTATION_ENCOUNTER_TYPE_UUID);

      expect(url).toContain('/ws/fhir2/R4/Encounter?');
      expect(url).toContain('location=cardiology-location-uuid');
      expect(url).toContain(`type=${CONSULTATION_ENCOUNTER_TYPE_UUID}`);
      expect(url).toContain('_count=100');
      expect(url).toContain('_sort=-date');
      expect(url).not.toContain('rest/v1/encounter');
    });
  });

  describe('fetchConsultationsInbox', () => {
    it('matches consultation encounter type coding from OpenMRS FHIR responses', async () => {
      mockedOpenmrsFetch
        .mockResolvedValueOnce({
          data: {
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'Encounter',
                  id: encounterUuid,
                  type: [
                    {
                      coding: [
                        {
                          system: 'http://fhir.openmrs.org/code-system/encounter-type',
                          code: CONSULTATION_ENCOUNTER_TYPE_UUID,
                          display: 'Consultation',
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        } as never)
        .mockResolvedValueOnce({
          data: {
            uuid: encounterUuid,
            encounterDatetime: '2026-05-22T11:14:08.000+0000',
            patient: { uuid: '965f2b42-30b1-41f8-a6d8-dbb84086d4f1', display: 'Patient Two Test' },
            location: { uuid: locationUuid, display: 'OPD' },
            obs: [],
            encounterProviders: [],
          },
        } as never);

      const consultations = await fetchConsultationsInbox(locationUuid, CONSULTATION_ENCOUNTER_TYPE_UUID, conceptUuids);

      expect(mockedOpenmrsFetch.mock.calls[0][0]).toContain(`type=${CONSULTATION_ENCOUNTER_TYPE_UUID}`);
      expect(consultations).toHaveLength(1);
      expect(consultations[0].encounterUuid).toBe(encounterUuid);
      expect(consultations[0].status).toBe('pending');
      expect(consultations[0].consultedDepartment.uuid).toBe(locationUuid);
    });
  });
});
