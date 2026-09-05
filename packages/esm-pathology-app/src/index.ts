import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { configSchema } from './config-schema';
import { pathologyResultsDashboardMeta } from './dashboard.meta';

const moduleName = '@palladium-ethiopia/esm-pathology-app';

const options = {
  featureName: 'pathology',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

// Tile rendered in `special-orders-slot`; opens the configured pathology order form in the O3 form engine.
export const pathologyOrderTile = getAsyncLifecycle(
  () => import('./pathology-order/pathology-order-tile.component'),
  options,
);

// Dedicated "Pathology Results" patient-chart dashboard: left-nav link + a widget listing the
// pathology DiagnosticReports returned from OpenELIS (the generic Results viewer can't surface them).
export const pathologyResultsDashboardLink =
  // t('Pathology Results', 'Pathology Results')
  getSyncLifecycle(createDashboardLink({ ...pathologyResultsDashboardMeta }), options);

export const pathologyResults = getAsyncLifecycle(
  () => import('./pathology-results/pathology-results.component'),
  options,
);
