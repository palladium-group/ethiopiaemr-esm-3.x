import { type DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

/**
 * Left-nav Pathology dashboard (Orders + Results tabs), separate from the generic Tests viewer.
 */
export const pathologyDashboardMeta: DashboardLinkConfig & { slot: string } = {
  slot: 'patient-chart-pathology-dashboard-slot',
  path: 'pathology',
  title: 'Pathology',
  icon: 'omrs-icon-microscope',
};
