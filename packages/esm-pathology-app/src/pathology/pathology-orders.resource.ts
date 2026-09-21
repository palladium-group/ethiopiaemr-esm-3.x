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

type EncounterSearchResponse = {
  results: Array<{
    uuid: string;
    encounterDatetime?: string;
    form?: PathologyRequestForm;
    obs?: Array<Obs>;
  }>;
};

const encounterRepresentation =
  'custom:(uuid,encounterDatetime,form:(uuid,display,name),' +
  'obs:(uuid,display,obsDatetime,concept:(uuid,display),' +
  'value,groupMembers:(uuid,display,concept:(uuid,display),value:(uuid,display),display)))';

/**
 * Loads Lab Order request encounters for pathology/cytology forms (by form UUID).
 */
export function usePathologyRequestEncounters(patientUuid: string, formUuids: Array<string>) {
  const forms = useMemo(() => [...new Set((formUuids ?? []).filter(Boolean))].sort(), [formUuids]);

  const key =
    patientUuid && forms.length
      ? `${restBaseUrl}/encounter?patient=${patientUuid}&order=desc&v=${encodeURIComponent(encounterRepresentation)}`
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, async (url: string) => {
    const response = await openmrsFetch<EncounterSearchResponse>(url);
    const formSet = new Set(forms);
    return (response.data?.results ?? [])
      .filter((encounter) => encounter.form?.uuid && formSet.has(encounter.form.uuid))
      .map(
        (encounter): PathologyRequestEncounter => ({
          uuid: encounter.uuid,
          encounterDatetime: encounter.encounterDatetime || '',
          form: encounter.form,
          obs: (encounter.obs ?? []).filter((obs) => Boolean(obs?.concept?.uuid)),
        }),
      );
  });

  return { encounters: data ?? [], error, isLoading, isValidating, mutate };
}

export function deleteEncounter(encounterUuid: string, abortController?: AbortController) {
  return openmrsFetch(`${restBaseUrl}/encounter/${encounterUuid}?purge=false`, {
    method: 'DELETE',
    signal: abortController?.signal,
  });
}
