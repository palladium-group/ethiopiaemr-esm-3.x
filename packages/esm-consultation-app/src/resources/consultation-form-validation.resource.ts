import type { ConsultationConceptUuids } from '../config-schema';
import type { ConsultationThread } from '../types/consultation.types';
import { mapEncounterToConsultation } from './consultation.resource';
import type { Encounter } from '@openmrs/esm-framework';

export type ConsultationFormValidationResult = {
  isValid: boolean;
  missingFields: Array<string>;
};

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function validateConsultationRequest(
  consultation: Pick<ConsultationThread, 'consultedDepartment' | 'consultationType' | 'request'>,
): ConsultationFormValidationResult {
  const missingFields: Array<string> = [];

  if (!hasText(consultation.consultedDepartment.uuid) && !hasText(consultation.consultedDepartment.display)) {
    missingFields.push('consultedDepartment');
  }

  if (!hasText(consultation.consultationType)) {
    missingFields.push('typeOfConsultation');
  }

  if (!hasText(consultation.request.reason)) {
    missingFields.push('reasonForConsultation');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export function validateConsultationResponse(
  consultation: Pick<ConsultationThread, 'response' | 'status'>,
): ConsultationFormValidationResult {
  const missingFields: Array<string> = [];

  if (!hasText(consultation.response?.briefFinding)) {
    missingFields.push('briefFinding');
  }

  if (!hasText(consultation.response?.recommendation)) {
    missingFields.push('recommendation');
  }

  return {
    isValid: consultation.status === 'completed' && missingFields.length === 0,
    missingFields,
  };
}

export function validateSavedConsultationEncounter(
  encounter: Encounter,
  conceptUuids: ConsultationConceptUuids,
  mode: 'create' | 'respond',
): ConsultationFormValidationResult {
  const consultation = mapEncounterToConsultation(encounter, conceptUuids);

  if (mode === 'create') {
    return validateConsultationRequest(consultation);
  }

  return validateConsultationResponse(consultation);
}
