import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';
import OrderCatalogPanel from './order-catalog-panel/order-catalog-panel.component';
import OrderCatalogWorkspace from './order-catalog-workspace/order-catalog-workspace.component';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

const options = {
  featureName: 'order-catalog-ethiopia',
  moduleName,
};

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const orderCatalogPanel = getSyncLifecycle(OrderCatalogPanel, options);

export const orderCatalogWorkspace = getSyncLifecycle(OrderCatalogWorkspace, options);
