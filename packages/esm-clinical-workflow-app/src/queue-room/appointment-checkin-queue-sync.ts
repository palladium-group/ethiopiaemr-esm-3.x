import { getGlobalStore, launchWorkspace2 } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { installVisitSaveInterceptor, installAppointmentCheckInInterceptor } from './visit-save-interceptor';

export const CREATE_QUEUE_ENTRY_WORKSPACE = 'create-queue-entry-workspace';
export const APPOINTMENTS_WINDOW = 'appointments-window';
export const APPOINTMENTS_START_VISIT_WORKSPACE = 'appointments-start-visit-workspace';
export const QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE = 'queue-patient-search-start-visit-workspace';

export function isAppointmentsContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. URL path check
  if (window.location.pathname.includes('/appointments')) {
    return true;
  }

  // 2. Open workspace check
  const workspaceStore = getGlobalStore<{
    openedWindows?: Array<{
      windowName: string;
      openedWorkspaces?: Array<{ workspaceName: string }>;
    }>;
  }>('workspace2');

  const openedWindows = workspaceStore?.getState?.()?.openedWindows ?? [];
  return openedWindows.some(
    (w) =>
      w.windowName === APPOINTMENTS_WINDOW ||
      w.openedWorkspaces?.some((ws) => ws.workspaceName === APPOINTMENTS_START_VISIT_WORKSPACE),
  );
}

export function isStartVisitWorkspaceOpen(): boolean {
  const workspaceStore = getGlobalStore<{
    openedWindows?: Array<{
      windowName: string;
      openedWorkspaces?: Array<{ workspaceName: string }>;
    }>;
  }>('workspace2');

  const openedWindows = workspaceStore?.getState?.()?.openedWindows ?? [];
  return openedWindows.some(
    (w) =>
      w.windowName === APPOINTMENTS_WINDOW &&
      w.openedWorkspaces?.some((ws) => ws.workspaceName === APPOINTMENTS_START_VISIT_WORKSPACE),
  );
}

let activeVisitTransition: {
  patientUuid: string;
  timeoutId: ReturnType<typeof setTimeout>;
} | null = null;

export function handleVisitSaved(patientUuid: string) {
  if (!isAppointmentsContext()) {
    return;
  }

  const workspaceStore = getGlobalStore<{
    openedWindows?: Array<{
      windowName: string;
      openedWorkspaces?: Array<{ workspaceName: string }>;
    }>;
  }>('workspace2');

  const executeTransition = () => {
    if (!activeVisitTransition || activeVisitTransition.patientUuid !== patientUuid) {
      return;
    }
    clearTimeout(activeVisitTransition.timeoutId);
    activeVisitTransition = null;

    // Invalidate visit caches so the newly created visit is recognized
    mutate((key) => typeof key === 'string' && key.includes('/visit'));

    launchWorkspace2(
      CREATE_QUEUE_ENTRY_WORKSPACE,
      {
        selectedPatientUuid: patientUuid,
      },
      {
        startVisitWorkspaceName: QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE,
      },
    ).catch((err) => {
      console.error('Failed to launch queue entry workspace after appointment check-in visit creation:', err);
    });
  };

  const unsubscribe = workspaceStore?.subscribe?.(() => {
    if (!activeVisitTransition || activeVisitTransition.patientUuid !== patientUuid) {
      unsubscribe?.();
      return;
    }

    // When the start-visit workspace has closed, launch the queue entry assignment workspace
    if (!isStartVisitWorkspaceOpen()) {
      unsubscribe?.();
      setTimeout(executeTransition, 50);
    }
  });

  const fallbackTimeoutId = setTimeout(() => {
    unsubscribe?.();
    executeTransition();
  }, 450);

  activeVisitTransition = {
    patientUuid,
    timeoutId: fallbackTimeoutId,
  };
}

export function handleAppointmentCheckedIn(patientUuid: string) {
  if (!isAppointmentsContext()) {
    return;
  }

  // When an appointment status transitions to CheckedIn:
  // If the patient does not have an active visit, the community app immediately opens
  // appointments-start-visit-workspace. In that case, handleVisitSaved will launch the queue workspace after visit save.
  // If the patient ALREADY has an active visit, no visit workspace is opened.
  // Wait briefly to confirm if the start-visit workspace opened. If not, launch queue selector directly.
  setTimeout(() => {
    if (isStartVisitWorkspaceOpen() || activeVisitTransition?.patientUuid === patientUuid) {
      return;
    }

    mutate((key) => typeof key === 'string' && key.includes('/visit'));

    launchWorkspace2(
      CREATE_QUEUE_ENTRY_WORKSPACE,
      {
        selectedPatientUuid: patientUuid,
      },
      {
        startVisitWorkspaceName: QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE,
      },
    ).catch((err) => {
      console.error('Failed to launch queue entry workspace after appointment check-in:', err);
    });
  }, 400);
}

let isSubscribed = false;

/**
 * Installs push-based sync for appointment check-in to automatically launch
 * the service queue selector workspace (create-queue-entry-workspace).
 */
export function subscribeAppointmentCheckInQueueSync(): () => void {
  if (isSubscribed) {
    return () => undefined;
  }
  isSubscribed = true;

  const uninstallVisit = installVisitSaveInterceptor(({ patientUuid }) => {
    handleVisitSaved(patientUuid);
  });

  const uninstallCheckIn = installAppointmentCheckInInterceptor(({ patientUuid }) => {
    handleAppointmentCheckedIn(patientUuid);
  });

  return () => {
    if (activeVisitTransition) {
      clearTimeout(activeVisitTransition.timeoutId);
      activeVisitTransition = null;
    }
    uninstallVisit();
    uninstallCheckIn();
    isSubscribed = false;
  };
}
