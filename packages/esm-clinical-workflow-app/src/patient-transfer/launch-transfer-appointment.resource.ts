import dayjs from 'dayjs';
import { mutate } from 'swr';
import {
  getGlobalStore,
  launchWorkspace2,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  translateFrom,
} from '@openmrs/esm-framework';
import { removePatientFromQueue } from './queue-entry-actions.resource';

const APPOINTMENTS_FORM_WORKSPACE = 'appointments-form-workspace';
const moduleName = '@palladium-ethiopia/esm-clinical-workflow-app';

type WorkspaceLifecycleState = 'waiting-for-open' | 'waiting-for-close' | 'completed';

const activeAppointmentSubscriptions = new Map<string, () => void>();
const queueEntriesBeingRemoved = new Set<string>();

function getSubscriptionKey(patientUuid: string, queueEntryUuid: string): string {
  return `${patientUuid}:${queueEntryUuid}`;
}

function clearActiveSubscription(subscriptionKey: string) {
  const unsubscribe = activeAppointmentSubscriptions.get(subscriptionKey);
  if (unsubscribe) {
    unsubscribe();
    activeAppointmentSubscriptions.delete(subscriptionKey);
  }
}

async function fetchPatientAppointmentUuids(patientUuid: string): Promise<Set<string>> {
  const response = await openmrsFetch<Array<{ uuid: string }>>(`${restBaseUrl}/appointments/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      patientUuid,
      startDate: dayjs().subtract(6, 'month').toISOString(),
    },
  });

  const appointments = response.data ?? [];
  return new Set(appointments.map((appointment) => appointment.uuid));
}

function isAppointmentWorkspaceOpenForPatient(state: { openedWindows?: Array<any> }, patientUuid: string): boolean {
  return (
    state.openedWindows?.some((window) =>
      window.openedWorkspaces?.some(
        (workspace) =>
          workspace.workspaceName === APPOINTMENTS_FORM_WORKSPACE && workspace.props?.patientUuid === patientUuid,
      ),
    ) ?? false
  );
}

async function mutateQueueEntries() {
  await mutate(
    (key) =>
      typeof key === 'string' &&
      (key.includes(`${restBaseUrl}/queue-entry`) || key.includes(`${restBaseUrl}/visit-queue-entry`)),
  );
  window.dispatchEvent(new CustomEvent('queue-entry-updated'));
}

async function handleWorkspaceClosed(patientUuid: string, queueEntryUuid: string, appointmentUuidsBefore: Set<string>) {
  if (queueEntriesBeingRemoved.has(queueEntryUuid)) {
    return;
  }

  queueEntriesBeingRemoved.add(queueEntryUuid);

  try {
    const appointmentUuidsAfter = await fetchPatientAppointmentUuids(patientUuid);
    const hasNewAppointment = [...appointmentUuidsAfter].some((uuid) => !appointmentUuidsBefore.has(uuid));

    if (hasNewAppointment) {
      const response = await removePatientFromQueue(queueEntryUuid);
      if (response.ok) {
        await mutateQueueEntries();
        showSnackbar({
          isLowContrast: true,
          kind: 'success',
          title: translateFrom(moduleName, 'patientRemoved', 'Patient removed'),
          subtitle: translateFrom(
            moduleName,
            'patientRemovedAfterAppointment',
            'Patient removed from queue after scheduling appointment',
          ),
        });
      } else {
        throw new Error(translateFrom(moduleName, 'patientRemovedFailed', 'Error removing patient from queue'));
      }
    }
  } catch (error) {
    showSnackbar({
      kind: 'error',
      title: translateFrom(moduleName, 'patientRemovedFailed', 'Error removing patient from queue'),
      subtitle: error instanceof Error ? error.message : undefined,
    });
  } finally {
    queueEntriesBeingRemoved.delete(queueEntryUuid);
  }
}

/**
 * Launches the appointments form workspace pre-populated for the patient.
 * When the user saves a new appointment, the patient is removed from the queue.
 */
export async function launchTransferAppointmentWorkspace(patientUuid: string, queueEntryUuid: string) {
  const subscriptionKey = getSubscriptionKey(patientUuid, queueEntryUuid);
  clearActiveSubscription(subscriptionKey);

  let appointmentUuidsBefore: Set<string>;

  try {
    appointmentUuidsBefore = await fetchPatientAppointmentUuids(patientUuid);
  } catch (error) {
    showSnackbar({
      kind: 'error',
      title: translateFrom(moduleName, 'appointmentPrefetchFailed', 'Unable to verify existing appointments'),
      subtitle: error instanceof Error ? error.message : undefined,
    });
    return;
  }

  try {
    const launched = await launchWorkspace2(APPOINTMENTS_FORM_WORKSPACE, { patientUuid });
    if (!launched) {
      showSnackbar({
        kind: 'warning',
        title: translateFrom(moduleName, 'appointmentWorkspaceNotOpened', 'Appointment form was not opened'),
        subtitle: translateFrom(
          moduleName,
          'appointmentWorkspaceNotOpenedDetail',
          'The appointment workspace is already open or the launch was cancelled.',
        ),
      });
      return;
    }
  } catch (error) {
    showSnackbar({
      kind: 'error',
      title: translateFrom(moduleName, 'appointmentWorkspaceLaunchFailed', 'Unable to open appointment form'),
      subtitle:
        error instanceof Error
          ? error.message
          : translateFrom(moduleName, 'appointmentWorkspaceNotLoaded', 'The appointments module may not be loaded.'),
    });
    return;
  }

  const workspace2Store = getGlobalStore<{ openedWindows?: Array<any> }>('workspace2');
  let lifecycleState: WorkspaceLifecycleState = 'waiting-for-open';

  const processWorkspaceState = () => {
    if (lifecycleState === 'completed') {
      return;
    }

    const state = workspace2Store.getState();
    const isOpen = isAppointmentWorkspaceOpenForPatient(state, patientUuid);

    if (lifecycleState === 'waiting-for-open') {
      if (isOpen) {
        lifecycleState = 'waiting-for-close';
      }
      return;
    }

    if (lifecycleState === 'waiting-for-close' && !isOpen) {
      lifecycleState = 'completed';
      clearActiveSubscription(subscriptionKey);
      handleWorkspaceClosed(patientUuid, queueEntryUuid, appointmentUuidsBefore);
    }
  };

  const unsubscribe = workspace2Store.subscribe(processWorkspaceState);
  activeAppointmentSubscriptions.set(subscriptionKey, unsubscribe);

  processWorkspaceState();
}
