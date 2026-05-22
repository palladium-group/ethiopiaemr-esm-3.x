import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCurrentPatient, launchWorkspace2, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { useStartVisitIfNeeded, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import type { ConsultationConfig } from '../config-schema';
import { CONSULTATION_FORM_NAME } from '../constants';
import { getActiveVisitForPatient } from '../resources/consultation-visit.resource';
import {
  buildConsultationFormWorkspaceData,
  consultationFormEntryWorkspaceName,
} from '../workspaces/consultation-form.workspace';

export function useLaunchConsultationForm(patientUuid: string) {
  const { t } = useTranslation();
  const config = useConfig<ConsultationConfig>();
  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);
  const { mutateVisitContext } = usePatientChartStore(patientUuid);
  const [isLaunching, setIsLaunching] = useState(false);

  const launchConsultationForm = useCallback(
    async (encounterUuid = '') => {
      if (!patientUuid?.trim()) {
        return false;
      }

      setIsLaunching(true);

      try {
        const didStartVisit = await startVisitIfNeeded();
        if (!didStartVisit) {
          return false;
        }

        const [patient, visit] = await Promise.all([
          fetchCurrentPatient(patientUuid),
          getActiveVisitForPatient(patientUuid),
        ]);

        if (!patient) {
          throw new Error('Failed to fetch patient data');
        }

        if (!visit?.uuid || !visit.visitType?.uuid) {
          throw new Error(t('consultationVisitRequired', 'An active visit is required to open the consultation form.'));
        }

        const workspaceData = buildConsultationFormWorkspaceData(
          patient,
          visit,
          config.consultationFormUuid,
          CONSULTATION_FORM_NAME,
          encounterUuid,
        );

        launchWorkspace2(consultationFormEntryWorkspaceName, workspaceData, {
          patient,
          patientUuid,
          visitContext: visit,
          mutateVisitContext: mutateVisitContext ?? null,
        });

        return true;
      } catch (error) {
        const subtitle =
          error instanceof Error
            ? error.message
            : t('consultationFormLaunchError', 'Unable to open the consultation form.');

        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle,
          isLowContrast: true,
        });

        return false;
      } finally {
        setIsLaunching(false);
      }
    },
    [config.consultationFormUuid, mutateVisitContext, patientUuid, startVisitIfNeeded, t],
  );

  return {
    isLaunching,
    launchConsultationForm,
  };
}
