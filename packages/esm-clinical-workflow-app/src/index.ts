import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from './createDashboardLink';
import { configSchema } from './config-schema';
import { dashboardMeta } from './dashboard.meta';

const moduleName = '@ethiopia/esm-clinical-workflow-app';

const options = {
  featureName: 'clinical-workflow',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const triageDashboardLink = getSyncLifecycle(createDashboardLink(dashboardMeta), options);
export const triageDashboard = getAsyncLifecycle(() => import('./triage/triage-dashboard.component'), options);
export const patientRegistrationWorkspace = getAsyncLifecycle(
  () => import('./patient-registration/patient.registration.workspace'),
  options,
);
