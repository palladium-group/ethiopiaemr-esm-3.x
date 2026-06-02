import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import ConsultationDashboard from './dashboard/consultation-dashboard.component';
import ConsultationDashboardLink from './dashboard/consultation-dashboard-link.extension';
import ConsultationInboxDashboard from './homepage/consultation-inbox-dashboard.component';
import ConsultationInboxDashboardLink from './homepage/consultation-inbox-dashboard-link.extension';
import { configSchema } from './config-schema';
import { moduleName } from './constants';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

const options = {
  featureName: 'consultation',
  moduleName,
};

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const consultationDashboardLink = getSyncLifecycle(ConsultationDashboardLink, options);
export const consultationDashboard = getSyncLifecycle(ConsultationDashboard, options);
export const consultationInboxDashboardLink = getSyncLifecycle(ConsultationInboxDashboardLink, options);
export const consultationInboxDashboard = getSyncLifecycle(ConsultationInboxDashboard, options);
