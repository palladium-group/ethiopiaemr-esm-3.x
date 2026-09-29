import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { configSchema } from './config-schema';
import { pathologyDashboardMeta } from './dashboard.meta';

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

// Patient-chart Pathology dashboard: left-nav link + Orders | Results tabs.
export const pathologyDashboardLink =
  // t('Pathology', 'Pathology')
  getSyncLifecycle(createDashboardLink({ ...pathologyDashboardMeta }), options);

export const pathologyDashboard = getAsyncLifecycle(() => import('./pathology/pathology.component'), options);
