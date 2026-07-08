import React from 'react';
import {
  defineConfigSchema,
  getAsyncLifecycle,
  getConfig,
  getGlobalStore,
  getSyncLifecycle,
} from '@openmrs/esm-framework';
import { createDashboardLink as createPatientChartDashboardLink } from '@openmrs/esm-patient-common-lib';
import { createDashboardLink } from './createDashboardLink';
import MRUDashboard from './mru/dashboard.component';
import { spaBasePath } from './constants';
import BillingInformationWorkspace from './mru/billing-information/billing-information.workspace';
import PatientScoreboard from './patient-scoreboard/patient-scoreboard.component';
import orderBasketActionButtonExtension from './patient-orders/order-basket-action-button/order-basket-action-button.component';
import clinicalFormsActionButtonExtension from './patient-forms/clinical-form-action-button.component';
import visitNotesActionButtonExtension from './patient-notes/visit-note-action-button.extension';
import diagnosesSummaryComponent from './patient-notes/diagnoses-summary.component';
import recentDiagnosesWidgetComponent from './patient-notes/recent-diagnoses-widget.component';
import patientTransferActionButtonExtension from './patient-transfer/patient-transfer-action-button.extension';
import pastVisitsOverviewComponent from './patient-chart/visit/visits-widget/visit-detail-overview.component';
import startVisitActionButtonComponent from './patient-chart/start-visit-action-button.component';
import FinishServiceButton from './patient-chart/finish-service-button.extension';
import AddPatientToWardSiderailButton from './ward/add-patient-to-ward-siderail-button.component';
import { subscribeAdmittedPatientsSlotSync } from './ward/admitted-patients/sync-admitted-patients-slot';
import { registerAdmitWorkspaceOverride } from './ward/admit-to-inpatient/register-admit-workspace-override';
import ImmunizationRegisterActionButton from './patient-immunization/immunization-register-action-button.component';
import { configSchema, type ClinicalWorkflowConfig } from './config-schema';
import { registerTriageDashboardExtensionsFromConfig } from './triage/register-triage-dashboard-extensions';
import EtlAdminDashboardLink from './admin/etl-admin-dashboard-link.extension';
import ReportsDashboardLink from './admin/reports-dashboard-link.extension';

const moduleName = '@palladium-ethiopia/esm-clinical-workflow-app';

const options = {
  featureName: 'clinical-workflow',
  moduleName,
};

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);

  getConfig(moduleName)
    .then((cfg) => {
      registerTriageDashboardExtensionsFromConfig(options, cfg as ClinicalWorkflowConfig);
    })
    .catch((err) => {
      console.error('[clinical-workflow] getConfig failed; triage extensions were not registered.', err);
    });

  // Remove the core visit-note workspace window since we're providing a custom one
  const workspace2Store = getGlobalStore<any>('workspace2');
  const removeCoreButton = () => {
    const state = workspace2Store.getState();
    if (state.registeredWindowsByName['visit-note']) {
      const newWindows = { ...state.registeredWindowsByName };
      delete newWindows['visit-note'];
      workspace2Store.setState({
        registeredWindowsByName: newWindows,
      });
    }
  };

  removeCoreButton();
  workspace2Store.subscribe(removeCoreButton);

  subscribeAdmittedPatientsSlotSync();
  registerAdmitWorkspaceOverride();
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const patientRegistrationWorkspace = getAsyncLifecycle(
  () => import('./patient-registration/patient.registration.workspace'),
  options,
);

export const mruDashboard = getSyncLifecycle(MRUDashboard, options);
export const mruLeftPanelLink = getSyncLifecycle(
  createDashboardLink({
    path: 'mru',
    title: 'MRU',
    basePath: spaBasePath,
  }),
  options,
);

export const billingInformationWorkspace = getSyncLifecycle(BillingInformationWorkspace, options);

export const patientScoreboardLink = getSyncLifecycle(
  createDashboardLink({
    path: 'patient-scoreboard',
    title: 'Patient Scoreboard',
    basePath: spaBasePath,
  }),
  options,
);

export const patientScoreboard = getSyncLifecycle(PatientScoreboard, options);

export const orderBasketActionButton = getSyncLifecycle(orderBasketActionButtonExtension, options);

export const clinicalFormsActionButton = getSyncLifecycle(clinicalFormsActionButtonExtension, options);

export const visitNoteActionButton = getSyncLifecycle(visitNotesActionButtonExtension, options);

export const patientTransferActionButton = getSyncLifecycle(patientTransferActionButtonExtension, options);

export const immunizationRegisterActionButton = getSyncLifecycle(ImmunizationRegisterActionButton, options);

export const confirmTransferDialog = getAsyncLifecycle(
  () => import('./patient-transfer/confirm-transfer-dialog.modal'),
  options,
);

export const visitNotesFormWorkspace = getAsyncLifecycle(
  () => import('./patient-notes/visit-notes-form-shadow.workspace'),
  options,
);

export const diagnosesDashboardLink =
  // t('Diagnoses', 'Diagnoses')
  getSyncLifecycle(
    createPatientChartDashboardLink({
      path: 'diagnoses',
      title: 'Diagnoses',
      icon: 'omrs-icon-list-checked',
    }),
    options,
  );

export const diagnosesDashboard = getSyncLifecycle(diagnosesSummaryComponent, options);

export const pastVisitsDetailOverviewShadow = getSyncLifecycle(pastVisitsOverviewComponent, {
  featureName: 'visits-detail-overview',
  moduleName,
});

export const queueTableTransferColumn = getAsyncLifecycle(
  () => import('./patient-transfer/queue-table-transfer-column.component'),
  options,
);

export const queueTableRoomColumn = getAsyncLifecycle(
  () => import('./queue-room/queue-table-room-column.component'),
  options,
);

export const queueTableActionsColumn = getAsyncLifecycle(
  () => import('./queue-room/queue-table-actions-column.component'),
  options,
);

export const assignQueueRoomModal = getAsyncLifecycle(() => import('./queue-room/assign-queue-room.modal'), options);

export const callQueueEntryModal = getAsyncLifecycle(() => import('./queue-room/call-queue-entry.modal'), options);

export const serviceQueuesDashboardShell = getAsyncLifecycle(
  () => import('./queue-room/service-queues-dashboard-shell.component'),
  options,
);

export const clinicalMetricsCardCheckedInPatients = getAsyncLifecycle(
  () => import('./queue-room/metrics/checked-in-patients-metric.extension'),
  options,
);

export const serviceQueueTableDashboard = getAsyncLifecycle(
  () => import('./queue-room/service-queue-table-dashboard.component'),
  options,
);

export const patientTransferDetailsModal = getAsyncLifecycle(
  () => import('./patient-transfer/transfer-details.modal'),
  options,
);

export const transferNotesOverview = getAsyncLifecycle(
  () => import('./patient-transfer/transfer-notes-overview.extension'),
  options,
);

export const startVisitActionButton = getSyncLifecycle(startVisitActionButtonComponent, {
  featureName: 'patient-action-start-visit',
  moduleName,
});

export const finishServiceButton = getSyncLifecycle(FinishServiceButton, {
  featureName: 'finish-service-button',
  moduleName,
});

export const addPatientToWardSiderailButton = getSyncLifecycle(AddPatientToWardSiderailButton, options);

export const ethiopiaAdmittedPatientsTable = getAsyncLifecycle(
  () => import('./ward/admitted-patients/ethiopia-admitted-patients-table.component'),
  options,
);

export const ethiopiaBedSwapWorkspace = getAsyncLifecycle(() => import('./ward/bed-swap/bed-swap.workspace'), options);

export const ethiopiaAdmitPatientFormWorkspace = getAsyncLifecycle(
  () => import('./ward/admit-to-inpatient/ethiopia-admit-patient-form.workspace'),
  options,
);

export const etlAdminDashboardLink = getSyncLifecycle(EtlAdminDashboardLink, options);

export const reportsDashboardLink = getSyncLifecycle(ReportsDashboardLink, options);
export const recentDiagnosesWidget = getSyncLifecycle(recentDiagnosesWidgetComponent, options);
