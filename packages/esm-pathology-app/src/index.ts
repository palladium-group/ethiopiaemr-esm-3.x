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

/** Tile on `special-orders-slot` → Pathology Orders (Type of Sample chooser). */
export const pathologyOrderTile = getAsyncLifecycle(
  () => import('./pathology-order/pathology-order-tile.component'),
  options,
);

/** Type of Sample chooser; opens the mapped request form for the selected option. */
export const pathologyOrderWorkspace = getAsyncLifecycle(
  () => import('./pathology-order/pathology-order.workspace'),
  options,
);

// Dedicated "Pathology Results" patient-chart dashboard: left-nav link + observations for members of
// the Pathology/Cytology Result Form concept sets (LIS-synced and future result-form fields).
export const pathologyResultsDashboardLink =
  // t('Pathology Results', 'Pathology Results')
  getSyncLifecycle(createDashboardLink({ ...pathologyResultsDashboardMeta }), options);

export const pathologyResults = getAsyncLifecycle(
  () => import('./pathology-results/pathology-results.component'),
  options,
);
