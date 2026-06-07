export const moduleName = '@palladium-ethiopia/esm-appointments-admin-app';

export const appointmentServiceAdminBasePath = `${window.spaBase}/appointment-service-admin`;

/** Workspace registration names. */
export const APPOINTMENT_SERVICE_ADMIN_WORKSPACE = 'appointment-service-admin-workspace';

/** WorkspaceContainer context key for the admin page. */
export const APPOINTMENT_SERVICE_ADMIN_CONTEXT_KEY = 'appointment-service-admin';

/** REST endpoints for Bahmni appointment service definitions. */
export const appointmentServiceListUrl = '/ws/rest/v1/appointmentService/all/full';

/** Single service by uuid: GET ?uuid={uuid}; POST to create/update. */
export const appointmentServiceUrl = '/ws/rest/v1/appointmentService';

export const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const WEEKDAYS: Array<DayOfWeek> = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
