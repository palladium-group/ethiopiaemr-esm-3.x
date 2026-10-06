import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { getGlobalStore, launchWorkspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { useServiceQueuesFilterState } from './service-queues-store.util';
import { installVisitSaveInterceptor } from './visit-save-interceptor';

const QUEUE_PATIENT_SEARCH_WORKSPACE = 'queue-patient-search-workspace';
const CREATE_QUEUE_ENTRY_WORKSPACE = 'create-queue-entry-workspace';
const QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE = 'queue-patient-search-start-visit-workspace';
const ADD_QUEUE_ENTRY_WINDOW = 'add-queue-entry';

/**
 * Uses workspaces2 registered by @openmrs/esm-service-queues-app v10+.
 */
const AddPatientToQueueButton: React.FC = () => {
  const { t } = useTranslation();
  const { selectedServiceUuid } = useServiceQueuesFilterState();
  const selectedServiceUuidRef = useRef(selectedServiceUuid);

  useEffect(() => {
    selectedServiceUuidRef.current = selectedServiceUuid;
  }, [selectedServiceUuid]);

  useEffect(() => {
    let pendingVisitTransition: {
      patientUuid: string;
      timeoutId: ReturnType<typeof setTimeout>;
    } | null = null;

    const workspaceStore = getGlobalStore<{
      openedWindows?: Array<{
        windowName: string;
        openedWorkspaces?: Array<{ workspaceName: string }>;
      }>;
    }>('workspace2');

    const executeTransition = () => {
      if (!pendingVisitTransition) {
        return;
      }
      const { patientUuid, timeoutId } = pendingVisitTransition;
      clearTimeout(timeoutId);
      pendingVisitTransition = null;

      // Invalidate SWR visit caches so useVisit fetches the active visit
      mutate((key) => typeof key === 'string' && key.includes('/visit'));

      launchWorkspace2(
        CREATE_QUEUE_ENTRY_WORKSPACE,
        {
          currentServiceQueueUuid: selectedServiceUuidRef.current,
          selectedPatientUuid: patientUuid,
        },
        {
          startVisitWorkspaceName: QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE,
        },
      ).catch((err) => {
        console.error('Failed to launch queue entry workspace after visit start:', err);
      });
    };

    // Watch workspace changes to detect when start-visit workspace closes
    const unsubscribeStore = workspaceStore?.subscribe?.((state) => {
      if (!pendingVisitTransition) {
        return;
      }

      const addQueueWindow = state.openedWindows?.find((w) => w.windowName === ADD_QUEUE_ENTRY_WINDOW);
      const isStartVisitWorkspaceOpen = addQueueWindow?.openedWorkspaces?.some(
        (w) => w.workspaceName === QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE,
      );

      // When the start-visit workspace has closed, launch the queue entry assignment workspace
      if (!isStartVisitWorkspaceOpen) {
        setTimeout(() => {
          executeTransition();
        }, 50);
      }
    });

    const uninstallInterceptor = installVisitSaveInterceptor(({ patientUuid }) => {
      const currentOpenedWindows = workspaceStore?.getState?.()?.openedWindows ?? [];
      const isAddQueueEntryOpen = currentOpenedWindows.some((w) => w.windowName === ADD_QUEUE_ENTRY_WINDOW);

      // Only transition if the visit was created while the add-queue-entry workspace window is active
      if (!isAddQueueEntryOpen) {
        return;
      }

      // Fallback timer in case the workspace subscription event does not fire
      const fallbackTimeoutId = setTimeout(() => {
        executeTransition();
      }, 400);

      pendingVisitTransition = {
        patientUuid,
        timeoutId: fallbackTimeoutId,
      };
    });

    return () => {
      if (pendingVisitTransition) {
        clearTimeout(pendingVisitTransition.timeoutId);
        pendingVisitTransition = null;
      }
      unsubscribeStore?.();
      uninstallInterceptor();
    };
  }, []);

  return (
    <Button
      kind="secondary"
      renderIcon={(props) => <Add size={16} {...props} />}
      size="sm"
      onClick={() => {
        launchWorkspace2(
          QUEUE_PATIENT_SEARCH_WORKSPACE,
          {
            initialQuery: '',
            workspaceTitle: t('addPatientToQueue', 'Add patient to queue'),
            onPatientSelected(
              _patientUuid: string,
              patient: fhir.Patient,
              launchChildWorkspace: Workspace2DefinitionProps['launchChildWorkspace'],
            ) {
              launchChildWorkspace(CREATE_QUEUE_ENTRY_WORKSPACE, {
                currentServiceQueueUuid: selectedServiceUuid,
                selectedPatientUuid: patient.id,
              });
            },
          },
          {
            startVisitWorkspaceName: QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE,
          },
        ).catch(() => undefined);
      }}>
      {t('addPatientToQueue', 'Add patient to queue')}
    </Button>
  );
};

export default AddPatientToQueueButton;
