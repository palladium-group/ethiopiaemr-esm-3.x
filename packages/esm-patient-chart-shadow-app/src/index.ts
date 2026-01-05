import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { esmPatientChartSchema } from '@openmrs/esm-patient-chart-app/src/config-schema';
import pastVisitsOverviewComponent from './visit/visits-widget/visit-detail-overview.component';

const moduleName = '@openmrs/esm-patient-chart-app';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, esmPatientChartSchema);
}

export const pastVisitsDetailOverviewShadow = getSyncLifecycle(pastVisitsOverviewComponent, {
  featureName: 'visits-detail-overview',
  moduleName,
});
