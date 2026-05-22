export const moduleName = '@palladium-ethiopia/esm-consultation-app';

export const spaBasePath = `${window.spaBase}/home`;

/** Homepage consultation inbox dashboard routing. */
export const CONSULTATION_INBOX_PATH = 'consultation-inbox';
export const CONSULTATION_INBOX_SLOT = 'consultation-inbox-dashboard-slot';

/** Workspace registration names for consultation form entry. */
export const CONSULTATION_FORM_ENTRY_WORKSPACE = 'consultation-form-entry-workspace';
export const CONSULTATION_INBOX_FORM_ENTRY_WORKSPACE = 'consultation-inbox-form-entry-workspace';
export const CONSULTATION_FORM_WINDOW = 'consultation-form';
export const CONSULTATION_INBOX_FORM_WINDOW = 'consultation-inbox-form';
export const CONSULTATION_WORKSPACE_GROUP = 'consultation-group';
export const CONSULTATION_FORM_NAME = 'Consultation';

/** Form resource UUID for the inter-department consultation form. */
export const CONSULTATION_FORM_UUID = '6d1da2cc-c846-4c89-b154-32811057751d';

/** Encounter type UUID for consultation encounters. */
export const CONSULTATION_ENCOUNTER_TYPE_UUID = '465a92f2-baf8-42e9-9612-53064be868e8';

/**
 * Concept UUIDs matching the consultation form JSON field definitions.
 * `consultedDepartment` uses the encounterLocation field type and is persisted on `encounter.location`.
 */
export const CONSULTATION_CONCEPT_UUIDS = {
  consultingDepartment: 'cf3a0425-051e-4dfc-8598-b2af8d35cba3',
  consultedDepartment: 'd7245ba1-35f3-4b10-b04f-38a812fad033',
  typeOfConsultation: '25eb4da9-0904-441f-b9b8-69ec7307a417',
  reasonForConsultation: 'a2bf2521-1635-4b72-9bca-ca581ef8752c',
  pertinentInvestigation: '23942b19-f729-4622-b73a-29e0ffc7448b',
  briefHistory: 'b986ec9e-da79-423e-80be-5875b87228ff',
  briefFinding: '28441853-da6d-450f-b88a-9205d4654783',
  recommendation: '36566305-0931-47d0-9de7-488c0ef4bef5',
} as const;

export type ConsultationConceptKey = keyof typeof CONSULTATION_CONCEPT_UUIDS;
