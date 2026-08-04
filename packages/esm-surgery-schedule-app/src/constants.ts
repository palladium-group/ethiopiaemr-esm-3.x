export const moduleName = '@palladium-ethiopia/esm-surgery-schedule-app';

export const spaBasePath = `${window.spaBase}/home`;

export const ELECTIVE_SURGERY_SCHEDULE_PATH = 'elective-surgery-schedule';
export const ELECTIVE_SURGERY_SCHEDULE_SLOT = 'elective-surgery-schedule-dashboard-slot';

export const RECORD_CONTACT_WORKSPACE = 'record-elective-surgery-contact-workspace';
export const REMOVE_PATIENT_WORKSPACE = 'remove-elective-surgery-patient-workspace';
export const RETURN_FROM_ADMISSION_WORKSPACE = 'return-from-surgical-admission-workspace';
export const ADMISSION_REQUEST_FORM_WORKSPACE = 'elective-surgery-admission-request-workspace';
export const SURGERY_SCHEDULE_FORM_WINDOW = 'elective-surgery-schedule-form';
export const SURGERY_SCHEDULE_WORKSPACE_GROUP = 'elective-surgery-schedule-group';

export const ELECTIVE_SURGERY_SCHEDULE_SWR_KEY = 'elective-surgery-schedule';
export const NEAR_DEADLINE_SWR_KEY = 'elective-surgery-schedule-near-deadline';
export const NEAR_DEADLINE_NOTIFICATION_SESSION_KEY = 'elective-surgery-near-deadline-notified';

export const ADMISSION_REQUEST_FORM_UUID = '5e725bad-750e-4d31-b4bc-cab4c9ea63ff';
export const ADMISSION_REQUEST_FORM_NAME = 'Admission Request';

export const ELECTIVE_SURGERY_API_PATH = '/ethiopiaemrcore/elective-surgery-schedule';

export const SURGERY_CATEGORIES: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

export const CATEGORY_SLA_MONTHS: Record<'A' | 'B' | 'C', number> = {
  A: 1,
  B: 3,
  C: 12,
};

export const DAYS_LEFT_WARNING_THRESHOLD = 14;
export const DAYS_LEFT_DANGER_THRESHOLD = 7;
