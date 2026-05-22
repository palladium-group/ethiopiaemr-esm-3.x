import type { Encounter } from '@openmrs/esm-framework';
import { CONSULTATION_CONCEPT_UUIDS } from '../constants';

const { conceptUuids } = {
  conceptUuids: CONSULTATION_CONCEPT_UUIDS,
};

function createObs(conceptUuid: string, value: string | { uuid: string; display: string }, obsDatetime: string) {
  return {
    uuid: `obs-${conceptUuid}-${obsDatetime}`,
    concept: { uuid: conceptUuid, display: conceptUuid },
    value,
    obsDatetime,
  };
}

const baseEncounter: Encounter = {
  uuid: 'encounter-uuid-1',
  encounterDatetime: '2026-05-20T09:00:00.000+0000',
  patient: {
    uuid: 'patient-uuid-1',
    display: 'Test Patient',
  },
  location: {
    uuid: 'cardiology-location-uuid',
    display: 'Cardiology',
  },
  encounterProviders: [
    {
      uuid: 'encounter-provider-1',
      provider: {
        uuid: 'requester-provider-uuid',
        person: {
          uuid: 'requester-person-uuid',
          display: 'Dr Requester',
        },
      },
      encounterRole: {
        uuid: 'role-uuid',
        display: 'Consulting Physician',
      },
    },
  ],
  obs: [
    createObs(conceptUuids.consultingDepartment, 'Internal Medicine', '2026-05-20T09:00:00.000+0000'),
    createObs(conceptUuids.typeOfConsultation, 'Urgent', '2026-05-20T09:01:00.000+0000'),
    createObs(conceptUuids.reasonForConsultation, 'Chest pain evaluation', '2026-05-20T09:02:00.000+0000'),
    createObs(conceptUuids.pertinentInvestigation, 'ECG shows ST elevation', '2026-05-20T09:03:00.000+0000'),
    createObs(conceptUuids.briefHistory, 'History of hypertension', '2026-05-20T09:04:00.000+0000'),
  ],
};

export const pendingConsultationEncounter: Encounter = {
  ...baseEncounter,
};

export const partialConsultationEncounter: Encounter = {
  ...baseEncounter,
  uuid: 'encounter-uuid-2',
  obs: [
    ...(baseEncounter.obs ?? []),
    createObs(conceptUuids.briefFinding, 'Mild cardiomegaly on CXR', '2026-05-20T11:00:00.000+0000'),
  ],
};

export const completedConsultationEncounter: Encounter = {
  ...baseEncounter,
  uuid: 'encounter-uuid-3',
  encounterProviders: [
    ...(baseEncounter.encounterProviders ?? []),
    {
      uuid: 'encounter-provider-2',
      provider: {
        uuid: 'consulted-provider-uuid',
        person: {
          uuid: 'consulted-person-uuid',
          display: 'Dr Consultant',
        },
      },
      encounterRole: {
        uuid: 'role-uuid-2',
        display: 'Consulted Physician',
      },
    },
  ],
  obs: [
    ...(baseEncounter.obs ?? []),
    createObs(conceptUuids.briefFinding, 'Mild cardiomegaly on CXR', '2026-05-20T11:00:00.000+0000'),
    createObs(conceptUuids.recommendation, 'Start aspirin and monitor', '2026-05-20T11:30:00.000+0000'),
  ],
};
