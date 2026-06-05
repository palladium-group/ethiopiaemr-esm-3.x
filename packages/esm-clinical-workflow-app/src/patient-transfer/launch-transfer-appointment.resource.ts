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

/**
 * Launches the appointments form workspace pre-populated for the patient.
 * When the user saves a new appointment, the patient is removed from the queue.
 */
export async function launchTransferAppointmentWorkspace(patientUuid: string, queueEntryUuid: string) {
  let appointmentUuidsBefore: Set<string>;

  try {
    appointmentUuidsBefore = await fetchPatientAppointmentUuids(patientUuid);
  } catch {
    appointmentUuidsBefore = new Set();
  }

  try {
    const launched = await launchWorkspace2(APPOINTMENTS_FORM_WORKSPACE, { patientUuid });
    if (!launched) {
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
  let hasBeenOpened = false;
  let wasOpen = false;

  const unsubscribe = workspace2Store.subscribe(async () => {
    const state = workspace2Store.getState();
    const isOpen = isAppointmentWorkspaceOpenForPatient(state, patientUuid);

    if (isOpen) {
      hasBeenOpened = true;
    }

    if (hasBeenOpened && wasOpen && !isOpen) {
      unsubscribe();

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
      }
    }

    wasOpen = isOpen;
  });
}
