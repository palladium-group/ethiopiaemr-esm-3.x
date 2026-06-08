export const moduleName = '@palladium-ethiopia/esm-appointments-quota-app';

export const appointmentServiceListUrl = '/ws/rest/v1/appointmentService/all/full';

export const appointmentServiceLoadUrl = '/ws/rest/v1/appointmentService/load';

export const appointmentSummaryUrl = '/ws/rest/v1/appointment/appointmentSummary';

/** Matches Java DayOfWeek order used by Bahmni (Date.getDay(): 0 = Sunday). */
export const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DEFAULT_WARN_THRESHOLD_PERCENT = 80;

export const DEFAULT_COUNT_STATUSES = ['Scheduled', 'CheckedIn', 'Completed'] as const;
