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

import {
  createVisitForPatient,
  ensureTriageVisitAttribute,
  getCurrentVisitForPatient,
  invalidateVisitCache,
} from './triage.resource';
import type { ClinicalWorkflowConfig } from '../config-schema';

/**
 * Private helper function to build workspace data for triage form entry
 * Follows DRY principle by extracting common logic
 */
const buildFormWorkspaceData = (
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>,
  visit: Visit,
  formUuid: string,
  formName: string,
  handlePostResponse?: (encounter: Encounter) => void,
) => {
  if (!visit?.uuid || !visit?.visitType?.uuid) {
    throw new Error('Invalid visit data received');
  }

  return {
    formEntryWorkspaceName: formName,
    patient,
    visitContext: visit,
    form: {
      visitUuid: visit.uuid,
      uuid: formUuid,
      visitTypeUuid: visit.visitType.uuid,
    },
    encounterUuid: '',
    handlePostResponse,
  };
};

/**
 * Launches triage form workspace for central triage workflow
 * Shows queue modal after form submission
 */
export const launchTriageFormWorkspace = (
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>,
  patientUuid: string,
  visit: Visit,
  formUuid: string,
  formName: string,
  t: TFunction<'translation', undefined>,
) => {
  // Queue modal handler - for central triage workflow
  const handleShowModal = (encounter: Encounter) => {
    const dispose = showModal('transition-patient-to-latest-queue-modal', {
      activeVisit: visit,
      closeModal: () => dispose(),
    });
  };

  const workspaceData = buildFormWorkspaceData(patient, visit, formUuid, formName, handleShowModal);

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
  handleStartVisitAndLaunchTriageForm: (
    patientUuid: string,
    formUuid: string,
    formName: string,
    triageId: string,
  ) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const useStartVisitAndLaunchTriageForm = (): UseStartVisitAndLaunchTriageFormReturn => {
  const { t } = useTranslation();
  const { visitTypeUuid, triageVisitAttributeTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { sessionLocation } = useSession();

  const handleStartVisitAndLaunchTriageForm = useCallback(
    async (patientUuid: string, formUuid: string, formName: string, triageId: string) => {
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

      if (!triageId?.trim()) {
        const validationError = new Error('Triage ID is required');
        setError(validationError);
        showSnackbar({
          title: t('triageDashboardError', 'Error'),
          kind: 'error',
          subtitle: t('triageDashboardInvalidTriageId', 'Invalid triage identifier'),
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
          const visitResponse = await createVisitForPatient(patientUuid, visitTypeUuid, sessionLocation.uuid, {
            attributeTypeUuid: triageVisitAttributeTypeUuid,
            triageId,
          });

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
        } else {
          await ensureTriageVisitAttribute(visit, triageVisitAttributeTypeUuid, triageId);
        }

        // Ensure visit-dependent UI (e.g., PatientBanner) sees the latest active visit
        invalidateVisitCache(patientUuid);

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
    [t, visitTypeUuid, triageVisitAttributeTypeUuid, sessionLocation],
  );

  return {
    handleStartVisitAndLaunchTriageForm,
    isLoading,
    error,
  };
};
