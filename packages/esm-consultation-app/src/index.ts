import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import ConsultationDashboardLink from './dashboard/consultation-dashboard-link.extension';
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
