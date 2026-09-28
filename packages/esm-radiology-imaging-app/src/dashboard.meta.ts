import { type DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

export const moduleName = '@palladium-ethiopia/esm-radiology-imaging-app';

export const dashboardMeta: DashboardLinkConfig & { slot: string } = {
  slot: 'patient-chart-radiology-imaging-dashboard-slot',
  path: 'radiology-and-imaging',
  title: 'Radiology and Imaging',
  icon: 'omrs-icon-image-medical',
};
