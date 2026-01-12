import { openmrsFetch, restBaseUrl, useConfig, type Encounter, type Obs } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { useMemo } from 'react';
import type { ClinicalWorkflowConfig } from '../config-schema';

export interface TransferData {
  uuid: string;
  encounterDatetime: string;
  transferDate: string;
  fromLocation: string;
  note: string;
}

export function useTransferData(visitUuid: string, patientUuid: string) {
  const config = useConfig<ClinicalWorkflowConfig>();
  const { transferEncounterTypeUuid, transferNoteConceptUuid } = config;
  const url = visitUuid
    ? `${restBaseUrl}/encounter?patient=${patientUuid}&visit=${visitUuid}&encounterType=${transferEncounterTypeUuid}&v=custom:(uuid,encounterDatetime,location:(uuid,display),obs:(uuid,concept:(uuid,display),value,obsDatetime))`
    : null;

  const { data, error, isLoading } = useSWR<{ data: { results: Encounter[] } }>(url, openmrsFetch);

  const transferData = useMemo(() => {
    if (!data?.data?.results?.length) {
      return null;
    }

    const sortedResults = data.data.results.sort(
      (a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime(),
    );
    const transferEncounter = sortedResults[0];

    return parseTransferEncounter(transferEncounter, transferNoteConceptUuid);
  }, [data, transferNoteConceptUuid]);

  return {
    transferData,
    isLoading,
    error,
  };
}

function parseTransferEncounter(encounter: Encounter, transferNoteConceptUuid: string): TransferData {
  const obs = encounter.obs || [];

  return {
    uuid: encounter.uuid,
    encounterDatetime: encounter.encounterDatetime,
    transferDate: encounter.encounterDatetime,
    fromLocation: encounter.location?.display || 'Not specified',
    note: findObsValue(obs, transferNoteConceptUuid) || 'Not specified',
  };
}

function findObsValue(obs: Obs[], conceptUuid: string): string {
  const observation = obs.find((o) => o.concept?.uuid === conceptUuid);
  if (!observation) {
    return '';
  }

  if (typeof observation.value === 'object' && observation.value !== null) {
    return (observation.value as any).display || String(observation.value);
  }

  return String(observation.value || '');
}
