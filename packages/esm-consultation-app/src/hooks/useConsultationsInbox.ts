import useSWR from 'swr';
import { useConfig, useSession } from '@openmrs/esm-framework';
import type { ConsultationConfig } from '../config-schema';
import { CONSULTATION_DATA_REFRESH_INTERVAL_MS } from '../constants';
import { getConsultationsInboxSwrKey } from '../resources/consultation-cache.resource';
import { fetchConsultationsInbox } from '../resources/consultation-inbox.resource';
import type { ConsultationThread } from '../types/consultation.types';

export function useConsultationsInbox() {
  const config = useConfig<ConsultationConfig>();
  const session = useSession();
  const sessionLocationUuid = session?.sessionLocation?.uuid;
  const { consultationEncounterTypeUuid, conceptUuids } = config;

  const swrKey =
    sessionLocationUuid != null
      ? getConsultationsInboxSwrKey(sessionLocationUuid, consultationEncounterTypeUuid)
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Array<ConsultationThread>, Error>(
    swrKey,
    () => fetchConsultationsInbox(sessionLocationUuid!, consultationEncounterTypeUuid, conceptUuids),
    { refreshInterval: CONSULTATION_DATA_REFRESH_INTERVAL_MS },
  );

  return {
    consultations: data ?? null,
    sessionLocationUuid,
    error,
    isLoading,
    isValidating,
    mutateConsultationsInbox: mutate,
  };
}
