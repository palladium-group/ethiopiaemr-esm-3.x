import { openmrsFetch, restBaseUrl, useConfig, type Encounter, type Obs } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { useMemo } from 'react';
import type { ClinicalWorkflowConfig } from '../config-schema';

export interface TransferObservation {
  conceptUuid: string;
  conceptName: string;
  value: string;
  obsDatetime: string;
}

export interface TransferNote {
  id: string;
  encounterUuid: string;
  encounterDate: string;
  transferDate: string;
  fromLocation: string;
  encounterProvider: string;
  encounterProviderRole: string;
  observations: TransferObservation[];
}

export function useTransferNotes(patientUuid: string, visitUuid: string | null) {
  const config = useConfig<ClinicalWorkflowConfig>();
  const { transferEncounterTypeUuid } = config;
  const customRepresentation =
    'custom:(uuid,display,encounterDatetime,patient,obs:(uuid,concept:(uuid,display),value,obsDatetime),' +
    'encounterProviders:(uuid,display,' +
    'encounterRole:(uuid,display),' +
    'provider:(uuid,person:(uuid,display))),' +
    'location:(uuid,display),visit:(uuid))';

  // Only fetch transfer encounters for the current visit
  const encountersApiUrl = visitUuid
    ? `${restBaseUrl}/encounter?patient=${patientUuid}&visit=${visitUuid}&encounterType=${transferEncounterTypeUuid}&v=${customRepresentation}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Encounter[] } }, Error>(
    encountersApiUrl,
    openmrsFetch,
  );

  const mapTransferNoteProperties = (encounter: Encounter, index: number): TransferNote => {
    const obs = encounter.obs || [];

    // Dynamically map all observations from the transfer form
    const observations: TransferObservation[] = obs
      .filter((o) => o.concept && o.value) // Only include observations with concept and value
      .map((observation) => ({
        conceptUuid: observation.concept?.uuid || '',
        conceptName: observation.concept?.display || 'Unknown',
        value: getObsValue(observation),
        obsDatetime: observation.obsDatetime || encounter.encounterDatetime,
      }))
      .sort((a, b) => a.conceptName.localeCompare(b.conceptName)); // Sort by concept name

    return {
      id: `${index}`,
      encounterUuid: encounter.uuid,
      encounterDate: encounter.encounterDatetime,
      transferDate: encounter.encounterDatetime,
      fromLocation: encounter.location?.display || 'Not specified',
      encounterProvider: encounter.encounterProviders?.[0]?.provider?.person?.display || 'Unknown',
      encounterProviderRole: encounter.encounterProviders?.[0]?.encounterRole?.display || '',
      observations,
    };
  };

  const formattedTransferNotes = data?.data?.results
    ?.map(mapTransferNoteProperties)
    ?.sort((noteA, noteB) => new Date(noteB.encounterDate).getTime() - new Date(noteA.encounterDate).getTime());

  return {
    transferNotes: data ? formattedTransferNotes : null,
    error,
    isLoading,
    isValidating,
    mutateTransferNotes: mutate,
  };
}

function getObsValue(observation: Obs): string {
  if (!observation) {
    return '';
  }

  if (typeof observation.value === 'object' && observation.value !== null) {
    return (observation.value as any).display || String(observation.value);
  }

  return String(observation.value || '');
}
