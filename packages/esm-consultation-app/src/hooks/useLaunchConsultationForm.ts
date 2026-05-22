import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import {
  fetchCurrentPatient,
  launchWorkspace2,
  showSnackbar,
  useConfig,
  useSession,
  type Encounter,
} from '@openmrs/esm-framework';
import {
  invalidateVisitAndEncounterData,
  usePatientChartStore,
  useStartVisitIfNeeded,
} from '@openmrs/esm-patient-common-lib';
import type { ConsultationConfig } from '../config-schema';
import { CONSULTATION_FORM_NAME } from '../constants';
import { getActiveVisitForPatient } from '../resources/consultation-visit.resource';
import {
  buildConsultationFormWorkspaceData,
  consultationFormEntryWorkspaceName,
} from '../workspaces/consultation-form.workspace';

type UseLaunchConsultationFormOptions = {
  onConsultationSaved?: () => void;
};

export function useLaunchConsultationForm(patientUuid: string, options: UseLaunchConsultationFormOptions = {}) {
  const { onConsultationSaved } = options;
  const { t } = useTranslation();
  const config = useConfig<ConsultationConfig>();
  const session = useSession();
  const { mutate: globalMutate } = useSWRConfig();
  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);
  const { visitContext, mutateVisitContext } = usePatientChartStore(patientUuid);
  const [isLaunching, setIsLaunching] = useState(false);

  const launchConsultationForm = useCallback(
    async (encounterUuid = '') => {
      if (!patientUuid?.trim()) {
        return false;
      }

      if (!session?.sessionLocation?.uuid) {
        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle: t('sessionLocationRequired', 'A session location is required to save a consultation.'),
          isLowContrast: true,
        });
        return false;
      }

      if (!session?.currentProvider?.uuid) {
        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle: t(
            'providerRequired',
            'Your user account must be linked to a provider before you can save a consultation.',
          ),
          isLowContrast: true,
        });
        return false;
      }

      setIsLaunching(true);

      try {
        const didStartVisit = await startVisitIfNeeded();
        if (!didStartVisit) {
          return false;
        }

        if (mutateVisitContext) {
          await mutateVisitContext();
        }

        const [patient, fetchedVisit] = await Promise.all([
          fetchCurrentPatient(patientUuid),
          getActiveVisitForPatient(patientUuid),
        ]);
        const visit = fetchedVisit ?? (visitContext?.stopDatetime == null ? visitContext : null);

        if (!patient) {
          throw new Error('Failed to fetch patient data');
        }

        if (!visit?.uuid || !visit.visitType?.uuid) {
          throw new Error(t('consultationVisitRequired', 'An active visit is required to open the consultation form.'));
        }

        const handlePostResponse = (_encounter: Encounter) => {
          invalidateVisitAndEncounterData(globalMutate, patientUuid);
          onConsultationSaved?.();
          showSnackbar({
            title: t('consultationSaved', 'Consultation saved'),
            kind: 'success',
            subtitle: encounterUuid
              ? t('consultationResponseSaved', 'Consultation response saved successfully.')
              : t('consultationRequestSaved', 'Consultation request sent successfully.'),
            isLowContrast: true,
          });
        };

        const workspaceData = buildConsultationFormWorkspaceData(
          patient,
          visit,
          config.consultationFormUuid,
          CONSULTATION_FORM_NAME,
          encounterUuid,
          handlePostResponse,
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
    [
      config.consultationFormUuid,
      globalMutate,
      mutateVisitContext,
      onConsultationSaved,
      patientUuid,
      session?.currentProvider?.uuid,
      session?.sessionLocation?.uuid,
      startVisitIfNeeded,
      t,
      visitContext,
    ],
  );

  return {
    isLaunching,
    launchConsultationForm,
  };
}
