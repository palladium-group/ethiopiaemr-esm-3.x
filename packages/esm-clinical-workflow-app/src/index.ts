import React from 'react';
import { defineConfigSchema, getAsyncLifecycle, getGlobalStore, getSyncLifecycle } from '@openmrs/esm-framework';
import { createDashboardLink } from './createDashboardLink';
import MRUDashboard from './mru/dashboard.component';
import { spaBasePath } from './constants';
import BillingInformationWorkspace from './mru/billing-information/billing-information.workspace';
import PatientScoreboard from './patient-scoreboard/patient-scoreboard.component';
import orderBasketActionButtonExtension from './patient-orders/order-basket-action-button/order-basket-action-button.component';
import visitNotesActionButtonExtension from './patient-notes/visit-note-action-button.extension';
import patientTransferActionButtonExtension from './patient-transfer/patient-transfer-action-button.extension';
import pastVisitsOverviewComponent from './patient-chart/visit/visits-widget/visit-detail-overview.component';
import startVisitActionButtonComponent from './patient-chart/start-visit-action-button.component';
import CentralTriagePage from './triage/variants/central-triage.page';
import EmergencyTriagePage from './triage/variants/emergency-triage.page';
import PatientTypeSelectionWorkspace from './triage/patient-type-selection.workspace';
import { configSchema } from './config-schema';

const moduleName = '@palladium-ethiopia/esm-clinical-workflow-app';

const options = {
  featureName: 'clinical-workflow',
  moduleName,
};

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);

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
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const centralTriageDashboard = getSyncLifecycle(CentralTriagePage, options);
export const emergencyTriageDashboard = getSyncLifecycle(EmergencyTriagePage, options);

export const centralTriageDashboardLink = getSyncLifecycle(
  createDashboardLink({
    path: 'central-triage',
    title: 'Central Triage',
    basePath: spaBasePath,
  }),
  options,
);

export const emergencyTriageDashboardLink = getSyncLifecycle(
  createDashboardLink({
    path: 'emergency-triage',
    title: 'Emergency Triage',
    basePath: spaBasePath,
  }),
  options,
);

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
export const patientTypeSelectionWorkspace = getSyncLifecycle(PatientTypeSelectionWorkspace, options);

export const emergencyQueueSelectionWorkspace = getAsyncLifecycle(
  () => import('./triage/emergency-queue-selection.workspace'),
  options,
);

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

export const visitNoteActionButton = getSyncLifecycle(visitNotesActionButtonExtension, options);

export const patientTransferActionButton = getSyncLifecycle(patientTransferActionButtonExtension, options);

export const confirmTransferDialog = getAsyncLifecycle(
  () => import('./patient-transfer/confirm-transfer-dialog.modal'),
  options,
);

export const visitNotesFormWorkspace = getAsyncLifecycle(
  () => import('./patient-notes/visit-notes-form-shadow.workspace'),
  options,
);

export const pastVisitsDetailOverviewShadow = getSyncLifecycle(pastVisitsOverviewComponent, {
  featureName: 'visits-detail-overview',
  moduleName,
});

export const queueTableTransferColumn = getAsyncLifecycle(
  () => import('./patient-transfer/queue-table-transfer-column.component'),
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
