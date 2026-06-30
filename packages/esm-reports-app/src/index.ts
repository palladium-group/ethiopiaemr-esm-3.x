import { getAsyncLifecycle } from '@openmrs/esm-framework';

const moduleName = '@palladium-ethiopia/esm-reports-app';

const options = {
  featureName: 'ethiopia-reports',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  // No runtime config schema: column order comes from each dataset's
  // metadata.columns (SQL SELECT order) and template feeder datasets are hidden
  // via each ReportDesign's repeatingSections. See report-request.ts.
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
