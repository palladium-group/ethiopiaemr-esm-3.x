import { type DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

// Left-nav item + dashboard for viewing pathology reports returned from OpenELIS. Kept separate from the
// generic Results viewer (which is bound to a lab-test concept tree pathology doesn't belong to), mirroring
// how Radiology / Procedures have their own patient-chart dashboards.
export const pathologyResultsDashboardMeta: DashboardLinkConfig & { slot: string } = {
  slot: 'patient-chart-pathology-results-dashboard-slot',
  path: 'pathology-results',
  title: 'Pathology Results',
  icon: 'omrs-icon-microscope',
};
