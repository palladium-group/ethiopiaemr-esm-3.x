import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type Obs } from '@openmrs/esm-framework';

export type PathologyRequestForm = {
  uuid: string;
  display?: string;
  name?: string;
};

export type PathologyRequestEncounter = {
  uuid: string;
  encounterDatetime: string;
  form?: PathologyRequestForm;
  obs: Array<Obs>;
};

type EncounterSearchResult = {
  uuid: string;
  encounterDatetime?: string;
  form?: PathologyRequestForm;
  obs?: Array<Obs>;
};

type EncounterSearchResponse = {
  results: Array<EncounterSearchResult>;
};

const encounterRepresentation =
  'custom:(uuid,encounterDatetime,form:(uuid,display,name),' +
  'obs:(uuid,display,obsDatetime,concept:(uuid,display),' +
  'value,groupMembers:(uuid,display,concept:(uuid,display),value:(uuid,display),display)))';

/** Request up to the typical REST absolute max; advance by actual result length. */
const ENCOUNTER_PAGE_LIMIT = 100;
/** Safety cap so a broken/ignored startIndex cannot loop forever. */
const ENCOUNTER_MAX_PAGES = 50;

/**
 * Fetches all patient encounters by paging REST results.
 * OpenMRS has no reliable encounter sort param and caps each page
 * (maxResultsAbsolute, typically 100); advance startIndex by the number
 * of rows actually returned so this still works if that cap changes.
 */
async function fetchAllPatientEncounters(patientUuid: string): Promise<Array<EncounterSearchResult>> {
  const all: Array<EncounterSearchResult> = [];
  let startIndex = 0;

  for (let page = 0; page < ENCOUNTER_MAX_PAGES; page++) {
    const url =
      `${restBaseUrl}/encounter?patient=${patientUuid}` +
      `&limit=${ENCOUNTER_PAGE_LIMIT}&startIndex=${startIndex}` +
      `&v=${encodeURIComponent(encounterRepresentation)}`;
    const response = await openmrsFetch<EncounterSearchResponse>(url);
    const results = response.data?.results ?? [];
    if (results.length === 0) {
      break;
    }
    all.push(...results);
    startIndex += results.length;
  }

  return all;
}

function toPathologyRequestEncounter(encounter: EncounterSearchResult): PathologyRequestEncounter {
  return {
    uuid: encounter.uuid,
    encounterDatetime: encounter.encounterDatetime || '',
    form: encounter.form,
    obs: (encounter.obs ?? []).filter((obs) => Boolean(obs?.concept?.uuid)),
  };
}

/**
 * Loads Lab Order request encounters for pathology/cytology forms (by form UUID).
 */
export function usePathologyRequestEncounters(patientUuid: string, formUuids: Array<string>) {
  const forms = useMemo(() => [...new Set((formUuids ?? []).filter(Boolean))].sort(), [formUuids]);

  // Include form UUIDs in the key so a config change does not reuse a stale filtered list.
  const key =
    patientUuid && forms.length ? (['pathologyRequestEncounters', patientUuid, forms.join(',')] as const) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, async ([, uuid, formsKey]) => {
    const formSet = new Set(formsKey.split(',').filter(Boolean));
    const encounters = await fetchAllPatientEncounters(uuid);
    return encounters
      .filter((encounter) => encounter.form?.uuid && formSet.has(encounter.form.uuid))
      .map(toPathologyRequestEncounter)
      .sort((a, b) => {
        const aTime = Date.parse(a.encounterDatetime) || 0;
        const bTime = Date.parse(b.encounterDatetime) || 0;
        return bTime - aTime;
      });
  });

  return { encounters: data ?? [], error, isLoading, isValidating, mutate };
}

export function deleteEncounter(encounterUuid: string, abortController?: AbortController) {
  return openmrsFetch(`${restBaseUrl}/encounter/${encounterUuid}?purge=false`, {
    method: 'DELETE',
    signal: abortController?.signal,
  });
}
