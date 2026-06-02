import { CONSULTATION_CONCEPT_UUIDS } from '../constants';
import { completedConsultationEncounter, pendingConsultationEncounter } from './consultation.fixture';
import { mapEncounterToConsultation } from './consultation.resource';
import {
  validateConsultationRequest,
  validateConsultationResponse,
  validateSavedConsultationEncounter,
} from './consultation-form-validation.resource';

const conceptUuids = { ...CONSULTATION_CONCEPT_UUIDS };

describe('consultation-form-validation.resource', () => {
  it('requires consulted department, type, and reason for a request', () => {
    const consultation = mapEncounterToConsultation(pendingConsultationEncounter, conceptUuids);

    expect(validateConsultationRequest(consultation).isValid).toBe(true);
    expect(
      validateConsultationRequest({
        ...consultation,
        consultedDepartment: { uuid: '', display: '' },
        consultationType: '',
        request: { ...consultation.request, reason: '' },
      }).missingFields,
    ).toEqual(['consultedDepartment', 'typeOfConsultation', 'reasonForConsultation']);
  });

  it('requires both feedback fields for a completed response', () => {
    const completed = mapEncounterToConsultation(completedConsultationEncounter, conceptUuids);

    expect(validateConsultationResponse(completed).isValid).toBe(true);
    expect(
      validateConsultationResponse({
        status: 'pending',
        response: { briefFinding: 'Some finding', recommendation: '' },
      }).isValid,
    ).toBe(false);
    expect(
      validateConsultationResponse({
        status: 'pending',
        response: { briefFinding: 'Some finding', recommendation: '' },
      }).missingFields,
    ).toEqual(['recommendation']);
  });

  it('validates saved encounters by create and respond mode', () => {
    expect(validateSavedConsultationEncounter(pendingConsultationEncounter, conceptUuids, 'create').isValid).toBe(true);
    expect(validateSavedConsultationEncounter(completedConsultationEncounter, conceptUuids, 'respond').isValid).toBe(
      true,
    );
  });
});
