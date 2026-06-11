import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';

import OrdersAdminNavLink from './extensions/orders-admin-nav-link.extension';
import OrderSetAdminWorkspace from './workspace/order-set-admin.workspace';
import OrderTemplateAdminWorkspace from './workspace/order-template-admin.workspace';

const options = {
  featureName: 'orders-admin',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

defineConfigSchema(moduleName, configSchema);

export function startupApp() {}

export const ordersAdminHome = getAsyncLifecycle(() => import('./home/home.component'), options);

export const ordersAdminNavLink = getSyncLifecycle(OrdersAdminNavLink, {
  featureName: 'orders-admin-nav-link',
  moduleName,
});

export const orderTemplateAdminWorkspace = getSyncLifecycle(OrderTemplateAdminWorkspace, {
  featureName: 'order-template-admin-workspace',
  moduleName,
});

export const orderSetAdminWorkspace = getSyncLifecycle(OrderSetAdminWorkspace, {
  featureName: 'order-set-admin-workspace',
  moduleName,
});
