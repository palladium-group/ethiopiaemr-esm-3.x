import { getAsyncLifecycle } from '@openmrs/esm-framework';

const moduleName = '@palladium-ethiopia/esm-shr-app';

const options = {
  featureName: 'ethiopia-shr-admin',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
