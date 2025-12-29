import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from './createDashboardLink';
import { configSchema } from './config-schema';
import { dashboardMeta } from './dashboard.meta';
import MRUDashboard from './mru/dashboard.component';
import { spaBasePath } from './constants';
import BillingInformationWorkspace from './mru/billing-information/billing-information.workspace';
import PatientScoreboard from './patient-scoreboard/patient-scoreboard.component';

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

export const mruDashboard = getSyncLifecycle(MRUDashboard, options);
export const mruLeftPanelLink = getSyncLifecycle(
  createDashboardLink({
    path: 'mru',
    title: 'MRU',
    basePath: spaBasePath,
  }),
  options,
);

export const billingInformationWorkspace = getSyncLifecycle(BillingInformationWorkspace, options);

export const patientScoreboardLink = getSyncLifecycle(
  createDashboardLink({
    path: 'patient-scoreboard',
    title: 'Patient Scoreboard',
    basePath: spaBasePath,
  }),
  options,
);

export const patientScoreboard = getSyncLifecycle(PatientScoreboard, options);
