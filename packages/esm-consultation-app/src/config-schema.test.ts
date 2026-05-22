import { CONSULTATION_CONCEPT_UUIDS, CONSULTATION_ENCOUNTER_TYPE_UUID, CONSULTATION_FORM_UUID } from './constants';
import { ConsultationPermissions } from './permissions/permissions.constants';
import { configSchema, type ConsultationConfig } from './config-schema';

describe('consultation config schema', () => {
  it('should define expected default form and encounter type UUIDs', () => {
    expect(configSchema.consultationFormUuid._default).toBe(CONSULTATION_FORM_UUID);
    expect(configSchema.consultationFormUuid._default).toBe('6d1da2cc-c846-4c89-b154-32811057751d');
    expect(configSchema.consultationEncounterTypeUuid._default).toBe(CONSULTATION_ENCOUNTER_TYPE_UUID);
    expect(configSchema.consultationEncounterTypeUuid._default).toBe('465a92f2-baf8-42e9-9612-53064be868e8');
  });

  it('should define default concept UUIDs matching the consultation form', () => {
    const defaults = configSchema.conceptUuids._default as ConsultationConfig['conceptUuids'];

    expect(defaults).toEqual(CONSULTATION_CONCEPT_UUIDS);
    expect(defaults.consultingDepartment).toBe('cf3a0425-051e-4dfc-8598-b2af8d35cba3');
    expect(defaults.consultedDepartment).toBe('d7245ba1-35f3-4b10-b04f-38a812fad033');
    expect(defaults.typeOfConsultation).toBe('25eb4da9-0904-441f-b9b8-69ec7307a417');
    expect(defaults.reasonForConsultation).toBe('a2bf2521-1635-4b72-9bca-ca581ef8752c');
    expect(defaults.pertinentInvestigation).toBe('23942b19-f729-4622-b73a-29e0ffc7448b');
    expect(defaults.briefHistory).toBe('b986ec9e-da79-423e-80be-5875b87228ff');
    expect(defaults.briefFinding).toBe('28441853-da6d-450f-b88a-9205d4654783');
    expect(defaults.recommendation).toBe('36566305-0931-47d0-9de7-488c0ef4bef5');
  });

  it('should define default consultation privileges', () => {
    expect(configSchema.viewConsultationPrivilege._default).toBe(ConsultationPermissions.ViewConsultations);
    expect(configSchema.requestConsultationPrivilege._default).toBe(ConsultationPermissions.RequestConsultation);
    expect(configSchema.respondConsultationPrivilege._default).toBe(ConsultationPermissions.RespondConsultation);
  });
});
