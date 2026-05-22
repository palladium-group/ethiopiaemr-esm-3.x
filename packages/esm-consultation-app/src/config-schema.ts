import { Type } from '@openmrs/esm-framework';
import {
  CONSULTATION_CONCEPT_UUIDS,
  CONSULTATION_ENCOUNTER_TYPE_UUID,
  CONSULTATION_FORM_UUID,
  type ConsultationConceptKey,
} from './constants';

export const configSchema = {
  consultationFormUuid: {
    _type: Type.UUID,
    _description: 'Form resource UUID opened for creating and responding to consultations.',
    _default: CONSULTATION_FORM_UUID,
  },
  consultationEncounterTypeUuid: {
    _type: Type.UUID,
    _description: 'Encounter type UUID used to query and persist consultation encounters.',
    _default: CONSULTATION_ENCOUNTER_TYPE_UUID,
  },
  conceptUuids: {
    _type: Type.Object,
    _description:
      'Concept UUIDs for consultation form fields. Used when mapping encounter observations to consultation threads.',
    _default: { ...CONSULTATION_CONCEPT_UUIDS },
  },
};

export type ConsultationConceptUuids = Record<ConsultationConceptKey, string>;

export interface ConsultationConfig {
  consultationFormUuid: string;
  consultationEncounterTypeUuid: string;
  conceptUuids: ConsultationConceptUuids;
}
