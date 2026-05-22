import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { ConsultationConfig } from '../config-schema';
import { useConsultationPrivileges } from './useConsultationPrivileges';
import { CONSULTATION_INBOX_FORM_ENTRY_WORKSPACE } from '../constants';
import { launchConsultationFormEntry } from '../resources/consultation-form-launch.resource';
import type { ConsultationThread } from '../types/consultation.types';

type UseLaunchConsultationResponseFromInboxOptions = {
  onConsultationSaved?: () => void;
};

export function useLaunchConsultationResponseFromInbox(options: UseLaunchConsultationResponseFromInboxOptions = {}) {
  const { onConsultationSaved } = options;
  const { t } = useTranslation();
  const config = useConfig<ConsultationConfig>();
  const session = useSession();
  const { canRespondToConsultation } = useConsultationPrivileges();
  const { mutate: globalMutate } = useSWRConfig();
  const [respondingEncounterUuid, setRespondingEncounterUuid] = useState<string | null>(null);

  const launchConsultationResponse = useCallback(
    async (consultation: ConsultationThread) => {
      setRespondingEncounterUuid(consultation.encounterUuid);

      try {
        return await launchConsultationFormEntry({
          patientUuid: consultation.patientUuid,
          encounterUuid: consultation.encounterUuid,
          formUuid: config.consultationFormUuid,
          workspaceName: CONSULTATION_INBOX_FORM_ENTRY_WORKSPACE,
          globalMutate,
          conceptUuids: config.conceptUuids,
          onConsultationSaved,
          t,
          sessionLocationUuid: session?.sessionLocation?.uuid,
          currentProviderUuid: session?.currentProvider?.uuid,
          hasRequiredPrivilege: canRespondToConsultation,
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
        setRespondingEncounterUuid(null);
      }
    },
    [
      config.consultationFormUuid,
      config.conceptUuids,
      globalMutate,
      onConsultationSaved,
      canRespondToConsultation,
      session?.currentProvider?.uuid,
      session?.sessionLocation?.uuid,
      t,
    ],
  );

  return {
    isResponding: Boolean(respondingEncounterUuid),
    respondingEncounterUuid,
    launchConsultationResponse,
  };
}
