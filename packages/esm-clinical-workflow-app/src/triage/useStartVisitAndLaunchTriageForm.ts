import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCurrentPatient, launchWorkspace2, showSnackbar } from '@openmrs/esm-framework';
import { createVisitForPatient } from './triage.resource';

const TRIAGE_FORM_UUID = '37f6bd8d-586a-4169-95fa-5781f987fe62';

interface UseStartVisitAndLaunchTriageFormReturn {
  handleStartVisitAndLaunchTriageForm: (patientUuid: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const useStartVisitAndLaunchTriageForm = (): UseStartVisitAndLaunchTriageFormReturn => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleStartVisitAndLaunchTriageForm = useCallback(
    async (patientUuid: string) => {
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

      setIsLoading(true);
      setError(null);

      try {
        // Fetch patient data
        const patient = await fetchCurrentPatient(patientUuid);

        if (!patient) {
          throw new Error('Failed to fetch patient data');
        }

        // Create visit for patient
        const visitResponse = await createVisitForPatient(patientUuid);

        if (!visitResponse.ok) {
          throw new Error(
            visitResponse.data?.error?.message ||
              t('triageDashboardErrorStartingVisit', 'Error starting visit for patient'),
          );
        }

        const { data: visit } = visitResponse;

        if (!visit?.uuid || !visit?.visitType?.uuid) {
          throw new Error('Invalid visit data received');
        }

        // Launch triage form workspace
        launchWorkspace2(
          'clinical-workflow-patient-form-entry-workspace',
          {
            formEntryWorkspaceName: t('triageForm', 'Triage Form'),
            patient,
            visitContext: visit,
            form: {
              visitUuid: visit.uuid,
              uuid: TRIAGE_FORM_UUID,
              visitTypeUuid: visit.visitType.uuid,
            },
            encounterUuid: '',
          },
          {
            patientUuid: patientUuid,
            patient: patient,
            visitContext: visit,
          },
        );
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
    [t],
  );

  return {
    handleStartVisitAndLaunchTriageForm,
    isLoading,
    error,
  };
};
