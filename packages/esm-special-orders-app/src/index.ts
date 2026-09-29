import { getAsyncLifecycle } from '@openmrs/esm-framework';

const moduleName = '@palladium-ethiopia/esm-special-orders-app';

const options = {
  featureName: 'special-orders',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {}

// Patient-chart siderail button that opens the Special Orders workspace.
export const specialOrdersActionButton = getAsyncLifecycle(
  () => import('./special-orders-action-button.component'),
  options,
);

// The Special Orders workspace, which hosts `special-orders-slot`.
export const specialOrdersWorkspace = getAsyncLifecycle(() => import('./special-orders.workspace'), options);
