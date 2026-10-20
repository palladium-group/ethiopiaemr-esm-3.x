import { type DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

export const shrDashboardMeta: DashboardLinkConfig & { slot: string } = {
  slot: 'patient-chart-shr-dashboard-slot',
  path: 'shared-health-record',
  title: 'Shared Health Record',
  icon: 'omrs-icon-document',
};
