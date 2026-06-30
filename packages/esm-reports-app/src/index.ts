import { getAsyncLifecycle } from '@openmrs/esm-framework';

const moduleName = '@palladium-ethiopia/esm-reports-app';

const options = {
  featureName: 'ethiopia-reports',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  // No runtime config schema: column order comes from the dataset's
  // metadata.columns (SQL SELECT order) and Excel feeder datasets are hidden by
  // the `<name>Excel` naming convention. See report-request.ts / report-results.
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
