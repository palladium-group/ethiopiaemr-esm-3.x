import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';

// Extensions
import AppointmentServiceAdminNavLink from './extensions/appointment-service-admin-nav-link.extension';

// Workspaces
import AppointmentServiceAdminWorkspace from './workspace/appointment-service-admin.workspace';

const options = {
  featureName: 'appointment-service-admin',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

// Register synchronously so frontend config keys are recognized at bootstrap.
defineConfigSchema(moduleName, configSchema);

export function startupApp() {}

export const appointmentServiceAdminHome = getAsyncLifecycle(() => import('./home/home.component'), options);

export const appointmentServiceAdminNavLink = getSyncLifecycle(AppointmentServiceAdminNavLink, {
  featureName: 'appointment-service-admin-nav-link',
  moduleName,
});

export const appointmentServiceAdminWorkspace = getSyncLifecycle(AppointmentServiceAdminWorkspace, {
  featureName: 'appointment-service-admin-workspace',
  moduleName,
});
