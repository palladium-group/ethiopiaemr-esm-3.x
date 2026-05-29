import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore, useStartVisitIfNeeded } from '@openmrs/esm-patient-common-lib';
import type { ConsultationConfig } from '../config-schema';
import { useConsultationPrivileges } from './useConsultationPrivileges';
import { launchConsultationFormEntry } from '../resources/consultation-form-launch.resource';
import { consultationFormEntryWorkspaceName } from '../workspaces/consultation-form.workspace';

type UseLaunchConsultationFormOptions = {
  onConsultationSaved?: () => void;
};

export function useLaunchConsultationForm(patientUuid: string, options: UseLaunchConsultationFormOptions = {}) {
  const { onConsultationSaved } = options;
  const { t } = useTranslation();
  const config = useConfig<ConsultationConfig>();
  const session = useSession();
  const { canRequestConsultation, canRespondToConsultation } = useConsultationPrivileges();
  const { mutate: globalMutate } = useSWRConfig();
  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);
  const { visitContext, mutateVisitContext } = usePatientChartStore(patientUuid);
  const [isLaunching, setIsLaunching] = useState(false);

  const launchConsultationForm = useCallback(
    async (encounterUuid = '', requestingProviderUuid?: string) => {
      setIsLaunching(true);

      try {
        return await launchConsultationFormEntry({
          patientUuid,
          encounterUuid,
          requestingProviderUuid,
          formUuid: config.consultationFormUuid,
          workspaceName: consultationFormEntryWorkspaceName,
          globalMutate,
          conceptUuids: config.conceptUuids,
          onConsultationSaved,
          t,
          sessionLocationUuid: session?.sessionLocation?.uuid,
          currentProviderUuid: session?.currentProvider?.uuid,
          hasRequiredPrivilege: encounterUuid ? canRespondToConsultation : canRequestConsultation,
          visitContext,
          mutateVisitContext,
          startVisitIfNeeded,
        });
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
      config.conceptUuids,
      globalMutate,
      mutateVisitContext,
      onConsultationSaved,
      patientUuid,
      canRequestConsultation,
      canRespondToConsultation,
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
