import useSWR from 'swr';
import { useConfig, useSession } from '@openmrs/esm-framework';
import type { ConsultationConfig } from '../config-schema';
import { fetchConsultationsInbox } from '../resources/consultation-inbox.resource';
import type { ConsultationThread } from '../types/consultation.types';

export function useConsultationsInbox() {
  const config = useConfig<ConsultationConfig>();
  const session = useSession();
  const sessionLocationUuid = session?.sessionLocation?.uuid;
  const { consultationEncounterTypeUuid, conceptUuids } = config;

  const swrKey =
    sessionLocationUuid != null
      ? (['consultations-inbox', sessionLocationUuid, consultationEncounterTypeUuid] as const)
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Array<ConsultationThread>, Error>(
    swrKey,
    () => fetchConsultationsInbox(sessionLocationUuid!, consultationEncounterTypeUuid, conceptUuids),
    { refreshInterval: 60000 },
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
