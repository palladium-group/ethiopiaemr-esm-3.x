import { Type } from '@openmrs/esm-framework';

/**
 * Config for @palladium-ethiopia/esm-appointments-admin-app.
 *
 * Quota enforcement config lives on @openmrs/esm-appointments-app so that
 * the booking workspace (community app) can read it directly.  Only
 * admin-specific settings live here.
 */
export const configSchema = {
  appointmentServiceAdminPrivilege: {
    _type: Type.String,
    _default: 'app:appointments:manageServiceAvailability',
    _description: 'Privilege required to see the appointment service admin link and open the admin workspace.',
  },
};

export interface ConfigObject {
  appointmentServiceAdminPrivilege: string;
}
