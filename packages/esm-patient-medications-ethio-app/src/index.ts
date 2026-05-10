import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import MedicationsSummary from './medications-summary/medications-summary.component';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const moduleName = '@palladium-ethiopia/esm-patient-medications-ethio-app';

const options = {
  featureName: 'patient-medications-ethiopia',
  moduleName,
};

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

/** Maps to routes.json extension `medications-details-widget-ethio` on `patient-chart-medications-dashboard-slot`. */
export const medicationsSummary = getSyncLifecycle(MedicationsSummary, options);
