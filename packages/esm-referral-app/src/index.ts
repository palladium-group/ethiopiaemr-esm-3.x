import { getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import ReferralNavLink from './components/referral-nav-link.extension';

const moduleName = '@palladium-ethiopia/esm-referral-app';

const options = {
  featureName: 'ethiopia-referral',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {}

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const referralDashboardLink = getSyncLifecycle(ReferralNavLink, options);
