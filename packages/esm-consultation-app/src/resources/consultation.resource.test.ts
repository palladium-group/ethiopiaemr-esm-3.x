import { CONSULTATION_CONCEPT_UUIDS, CONSULTATION_ENCOUNTER_TYPE_UUID } from '../constants';
import {
  completedConsultationEncounter,
  partialConsultationEncounter,
  pendingConsultationEncounter,
} from './consultation.fixture';
import {
  getConsultationStatus,
  getConsultationsByPatientUrl,
  getObsValue,
  mapEncounterToConsultation,
  mapEncountersToConsultations,
} from './consultation.resource';

const conceptUuids = { ...CONSULTATION_CONCEPT_UUIDS };

describe('consultation.resource', () => {
  describe('getConsultationsByPatientUrl', () => {
    it('builds the expected encounter search URL', () => {
      const url = getConsultationsByPatientUrl('patient-uuid-1', CONSULTATION_ENCOUNTER_TYPE_UUID);

      expect(url).toContain('encounter?patient=patient-uuid-1');
      expect(url).toContain(`encounterType=${CONSULTATION_ENCOUNTER_TYPE_UUID}`);
      expect(url).toContain('order=desc');
      expect(url).toContain('v=custom:');
    });
  });

  describe('mapEncountersToConsultations', () => {
    it('maps and sorts consultations by requested date descending', () => {
      const olderEncounter = {
        ...pendingConsultationEncounter,
        uuid: 'encounter-older',
        encounterDatetime: '2026-05-01T09:00:00.000+0000',
      };
      const newerEncounter = {
        ...pendingConsultationEncounter,
        uuid: 'encounter-newer',
        encounterDatetime: '2026-05-20T09:00:00.000+0000',
      };

      const consultations = mapEncountersToConsultations([olderEncounter, newerEncounter], conceptUuids);

      expect(consultations.map((consultation) => consultation.encounterUuid)).toEqual([
        'encounter-newer',
        'encounter-older',
      ]);
      expect(consultations).toHaveLength(2);
    });
  });

  describe('getObsValue', () => {
    it('returns display for coded obs values', () => {
      expect(
        getObsValue({
          uuid: 'obs-1',
          concept: { uuid: 'concept-1', display: 'Type' },
          value: { uuid: 'answer-1', display: 'Urgent' },
          obsDatetime: '2026-05-20T09:00:00.000+0000',
        }),
      ).toBe('Urgent');
    });

    it('returns string for text obs values', () => {
      expect(
        getObsValue({
          uuid: 'obs-2',
          concept: { uuid: 'concept-2', display: 'Reason' },
          value: 'Chest pain',
          obsDatetime: '2026-05-20T09:00:00.000+0000',
        }),
      ).toBe('Chest pain');
    });
  });

  describe('getConsultationStatus', () => {
    it('returns pending when feedback obs are empty', () => {
      expect(getConsultationStatus({ briefFinding: '', recommendation: '' })).toBe('pending');
    });

    it('returns pending when only one feedback obs is filled', () => {
      expect(getConsultationStatus({ briefFinding: 'Some finding', recommendation: '' })).toBe('pending');
    });

    it('returns completed when both feedback obs are filled', () => {
      expect(
        getConsultationStatus({
          briefFinding: 'Some finding',
          recommendation: 'Follow up in clinic',
        }),
      ).toBe('completed');
    });
  });

  describe('mapEncounterToConsultation', () => {
    it('maps a pending consultation encounter', () => {
      const consultation = mapEncounterToConsultation(pendingConsultationEncounter, conceptUuids);

      expect(consultation).toEqual({
        encounterUuid: 'encounter-uuid-1',
        patientUuid: 'patient-uuid-1',
        status: 'pending',
        consultationType: 'Urgent',
        consultingDepartment: 'Internal Medicine',
        consultedDepartment: {
          uuid: 'cardiology-location-uuid',
          display: 'Cardiology',
        },
        requestingProvider: {
          uuid: 'requester-provider-uuid',
          display: 'Dr Requester',
        },
        consultedProvider: undefined,
        requestedAt: '2026-05-20T09:00:00.000+0000',
        respondedAt: undefined,
        request: {
          reason: 'Chest pain evaluation',
          pertinentInvestigation: 'ECG shows ST elevation',
          briefHistory: 'History of hypertension',
        },
        response: undefined,
      });
    });

    it('maps a partially completed consultation as pending', () => {
      const consultation = mapEncounterToConsultation(partialConsultationEncounter, conceptUuids);

      expect(consultation.status).toBe('pending');
      expect(consultation.response).toBeUndefined();
      expect(consultation.consultedProvider).toBeUndefined();
      expect(consultation.respondedAt).toBeUndefined();
    });

    it('maps a completed consultation encounter', () => {
      const consultation = mapEncounterToConsultation(completedConsultationEncounter, conceptUuids);

      expect(consultation.status).toBe('completed');
      expect(consultation.consultedProvider).toEqual({
        uuid: 'consulted-provider-uuid',
        display: 'Dr Consultant',
      });
      expect(consultation.response).toEqual({
        briefFinding: 'Mild cardiomegaly on CXR',
        recommendation: 'Start aspirin and monitor',
      });
      expect(consultation.respondedAt).toBe('2026-05-20T11:30:00.000+0000');
    });

    it('uses the latest obs value when duplicate concepts exist', () => {
      const encounter = {
        ...pendingConsultationEncounter,
        obs: [
          ...(pendingConsultationEncounter.obs ?? []),
          {
            uuid: 'obs-reason-old',
            concept: { uuid: conceptUuids.reasonForConsultation, display: 'Reason' },
            value: 'Old reason',
            obsDatetime: '2026-05-20T08:00:00.000+0000',
          },
          {
            uuid: 'obs-reason-new',
            concept: { uuid: conceptUuids.reasonForConsultation, display: 'Reason' },
            value: 'Updated reason',
            obsDatetime: '2026-05-20T12:00:00.000+0000',
          },
        ],
      };

      const consultation = mapEncounterToConsultation(encounter, conceptUuids);

      expect(consultation.request.reason).toBe('Updated reason');
    });
  });
});
