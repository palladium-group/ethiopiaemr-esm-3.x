import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Encounter,
  fetchCurrentPatient,
  launchWorkspace2,
  showModal,
  showSnackbar,
  useConfig,
  useSession,
  Visit,
} from '@openmrs/esm-framework';

import { createVisitForPatient, getCurrentVisitForPatient } from './triage.resource';
import type { ClinicalWorkflowConfig } from '../config-schema';

export const launchTriageFormWorkspace = (
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>,
  patientUuid: string,
  visit: Visit,
  formUuid: string,
  formName: string,
  t: TFunction<'translation', undefined>,
) => {
  const handleShowModal = (encounter: Encounter) => {
    const dispose = showModal('transition-patient-to-latest-queue-modal', {
      activeVisit: visit,
      closeModal: () => dispose(),
    });
  };

  if (!visit?.uuid || !visit?.visitType?.uuid) {
    throw new Error('Invalid visit data received');
  }

  const workspaceData = {
    formEntryWorkspaceName: formName,
    patient,
    visitContext: visit,
    form: {
      visitUuid: visit.uuid,
      uuid: formUuid,
      visitTypeUuid: visit.visitType.uuid,
    },
    encounterUuid: '',
    handlePostResponse: handleShowModal,
  };

  launchWorkspace2('clinical-workflow-patient-form-entry-workspace', workspaceData, {
    patient: patient,
    patientUuid: patientUuid,
    visitContext: visit,
  });

  // Set z-index for workspace container
  setTimeout(() => {
    const workspaceContainer = document.getElementById('omrs-workspaces-container');
    if (workspaceContainer) {
      workspaceContainer.style.zIndex = '100';
    }
  }, 0);
};

interface UseStartVisitAndLaunchTriageFormReturn {
  handleStartVisitAndLaunchTriageForm: (patientUuid: string, formUuid: string, formName: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const useStartVisitAndLaunchTriageForm = (): UseStartVisitAndLaunchTriageFormReturn => {
  const { t } = useTranslation();
  const { visitTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { sessionLocation } = useSession();

  const handleStartVisitAndLaunchTriageForm = useCallback(
    async (patientUuid: string, formUuid: string, formName: string) => {
      if (!patientUuid?.trim()) {
        const validationError = new Error('Patient UUID is required');
        setError(validationError);
        showSnackbar({
          title: t('triageDashboardError', 'Error'),
          kind: 'error',
          subtitle: t('triageDashboardInvalidPatientUuid', 'Invalid patient identifier'),
          isLowContrast: true,
        });
        return;
      }

      if (!formUuid?.trim()) {
        const validationError = new Error('Form UUID is required');
        setError(validationError);
        showSnackbar({
          title: t('triageDashboardError', 'Error'),
          kind: 'error',
          subtitle: t('triageDashboardInvalidFormUuid', 'Invalid form identifier'),
          isLowContrast: true,
        });
        return;
      }

      if (!formName?.trim()) {
        const validationError = new Error('Form name is required');
        setError(validationError);
        showSnackbar({
          title: t('triageDashboardError', 'Error'),
          kind: 'error',
          subtitle: t('triageDashboardInvalidFormName', 'Invalid form name'),
          isLowContrast: true,
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch patient data
        const patient = await fetchCurrentPatient(patientUuid);

        if (!patient) {
          throw new Error('Failed to fetch patient data');
        }

        let visit = await getCurrentVisitForPatient(patientUuid);
        if (!visit) {
          const visitResponse = await createVisitForPatient(patientUuid, visitTypeUuid, sessionLocation.uuid);

          if (!visitResponse.ok) {
            throw new Error(
              visitResponse.data?.error?.message ||
                t('triageDashboardErrorStartingVisit', 'Error starting visit for patient'),
            );
          }

          visit = await getCurrentVisitForPatient(patientUuid);

          if (!visit) {
            throw new Error('Failed to retrieve newly created visit');
          }
        }

        // Launch triage form workspace with visit
        launchTriageFormWorkspace(patient, patientUuid, visit, formUuid, formName, t);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t('triageDashboardUnexpectedError', 'An unexpected error occurred');

        setError(err instanceof Error ? err : new Error(errorMessage));

        showSnackbar({
          title: t('triageDashboardErrorStartingVisit', 'Error starting visit for patient'),
          kind: 'error',
          subtitle: errorMessage,
          isLowContrast: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [t, visitTypeUuid, sessionLocation],
  );

  return {
    handleStartVisitAndLaunchTriageForm,
    isLoading,
    error,
  };
};
