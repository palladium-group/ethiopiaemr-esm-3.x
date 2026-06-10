export const moduleName = '@palladium-ethiopia/esm-appointments-quota-app';

export const appointmentServiceListUrl = '/ws/rest/v1/appointmentService/all/full';

/** Paths relative to {@link restBaseUrl} (`/ws/rest/v1`). */
export const appointmentServiceLoadUrl = '/appointmentService/load';

export const appointmentSummaryUrl = '/appointment/appointmentSummary';

/** Bahmni appointments REST date format (matches community esm-appointments-app). */
export const omrsDateFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZZ';

/**
 * Bahmni {@link appointmentServiceLoadUrl} expects UTC instants without a timezone suffix.
 * {@code DateUtil.convertToLocalDateFromUTC} parses this pattern as UTC.
 */
export const bahmniUtcDateTimeFormat = 'YYYY-MM-DDTHH:mm:ss.SSS';

/** Matches Java DayOfWeek order used by Bahmni (Date.getDay(): 0 = Sunday). */
export const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DEFAULT_WARN_THRESHOLD_PERCENT = 80;

export const DEFAULT_COUNT_STATUSES = ['Scheduled', 'CheckedIn', 'Completed'] as const;

/** Community appointments booking form — appointments dashboard and other apps. */
export const APPOINTMENTS_FORM_WORKSPACE = 'appointments-form-workspace';

/** Same form component, registered for the patient chart workspace group. */
export const PATIENT_CHART_APPOINTMENTS_FORM_WORKSPACE = 'patient-chart-appointments-form-workspace';

/** All workspace names that render the community appointment booking form. */
export const BOOKING_FORM_WORKSPACE_NAMES = [
  APPOINTMENTS_FORM_WORKSPACE,
  PATIENT_CHART_APPOINTMENTS_FORM_WORKSPACE,
] as const;

export const APPOINTMENTS_WINDOW = 'appointments-window';
