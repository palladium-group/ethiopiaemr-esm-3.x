import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, useConfig, type Encounter } from '@openmrs/esm-framework';
import type { ConsultationConfig } from '../config-schema';
import { getConsultationsByPatientUrl, mapEncountersToConsultations } from '../resources/consultation.resource';
import type { ConsultationThread } from '../types/consultation.types';

export function useConsultationsByPatient(patientUuid: string | null | undefined) {
  const config = useConfig<ConsultationConfig>();
  const { consultationEncounterTypeUuid, conceptUuids } = config;

  const apiUrl = useMemo(
    () => (patientUuid ? getConsultationsByPatientUrl(patientUuid, consultationEncounterTypeUuid) : null),
    [consultationEncounterTypeUuid, patientUuid],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Array<Encounter> } }, Error>(
    apiUrl,
    openmrsFetch,
  );

  const consultations: Array<ConsultationThread> | null = useMemo(() => {
    if (!data) {
      return null;
    }

    return mapEncountersToConsultations(data.data.results, conceptUuids);
  }, [conceptUuids, data]);

  return {
    consultations,
    error,
    isLoading,
    isValidating,
    mutateConsultations: mutate,
  };
}
