import { getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import ShrDashboardLink from './patient-chart/shr-dashboard-link.component';

const moduleName = '@palladium-ethiopia/esm-shr-app';

const options = {
  featureName: 'ethiopia-shr-admin',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {}

export const root = getAsyncLifecycle(() => import('./root.component'), options);

const chartOptions = {
  featureName: 'ethiopia-shr-patient-chart',
  moduleName,
};

// Synchronous, as the other chart links are, so the left nav does not reflow as it loads.
// The link's title is translated by the styleguide as t(title).
// t('Shared Health Record', 'Shared Health Record')
export const shrDashboardLink = getSyncLifecycle(ShrDashboardLink, chartOptions);

export const shrDashboard = getAsyncLifecycle(() => import('./patient-chart/shr-dashboard.component'), chartOptions);

export const shrRequestAccessModal = getAsyncLifecycle(
  () => import('./patient-chart/request-access.modal'),
  chartOptions,
);
