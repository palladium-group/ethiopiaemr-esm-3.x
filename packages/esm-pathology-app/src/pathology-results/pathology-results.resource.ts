import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export type ResultConceptMember = {
  uuid: string;
  display: string;
};

export type PathologyResultObservation = {
  id: string;
  issued: string;
  status: string;
  field: string;
  conceptUuid: string;
  value: string;
};

type ConceptSetResponse = {
  uuid: string;
  display: string;
  setMembers?: Array<{ uuid: string; display: string }>;
};

type ObsResponse = {
  results: Array<{
    uuid: string;
    display?: string;
    obsDatetime?: string;
    value?: string | number | boolean | { display?: string; uuid?: string };
    concept?: { uuid: string; display?: string };
    status?: string;
  }>;
};

/**
 * Loads members of pathology/cytology result-form concept sets.
 * The dashboard renders observations for these members (no per-field LOINC list in the frontend).
 */
export function useResultConceptSetMembers(conceptSetUuids: Array<string>) {
  const uuids = (conceptSetUuids ?? []).filter(Boolean);
  const key = uuids.length ? ['special-order-result-concept-sets', ...uuids].join('|') : null;

  const { data, error, isLoading } = useSWR<Array<ResultConceptMember>>(key, async () => {
    const membersByUuid = new Map<string, ResultConceptMember>();
    await Promise.all(
      uuids.map(async (conceptSetUuid) => {
        const response = await openmrsFetch<ConceptSetResponse>(
          `${restBaseUrl}/concept/${conceptSetUuid}?v=custom:(uuid,display,setMembers:(uuid,display))`,
        );
        for (const member of response.data?.setMembers ?? []) {
          if (member?.uuid) {
            membersByUuid.set(member.uuid, { uuid: member.uuid, display: member.display || member.uuid });
          }
        }
      }),
    );
    return Array.from(membersByUuid.values());
  });

  return { members: data ?? [], error, isLoading };
}

/**
 * Fetches patient Observations for the given result-form concept-set members.
 */
export function usePathologyResultObservations(patientUuid: string, members: Array<ResultConceptMember>) {
  const conceptUuids = useMemo(
    () =>
      members
        .map((m) => m.uuid)
        .filter(Boolean)
        .sort(),
    [members],
  );
  const displayByConcept = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) {
      map[member.uuid] = member.display;
    }
    return map;
  }, [members]);

  const key =
    patientUuid && conceptUuids.length ? ['special-order-result-obs', patientUuid, ...conceptUuids].join('|') : null;

  const { data, error, isLoading, isValidating } = useSWR<Array<PathologyResultObservation>>(key, async () => {
    const bundles = await Promise.all(
      conceptUuids.map(async (conceptUuid) => {
        const response = await openmrsFetch<ObsResponse>(
          `${restBaseUrl}/obs?patient=${patientUuid}&concept=${conceptUuid}` +
            `&v=custom:(uuid,display,obsDatetime,value,status,concept:(uuid,display))`,
        );
        return (response.data?.results ?? []).map((obs) => ({
          id: obs.uuid,
          issued: obs.obsDatetime || '',
          status: obs.status || '',
          field: displayByConcept[conceptUuid] || obs.concept?.display || 'Result',
          conceptUuid,
          value: formatRestObsValue(obs.value),
        }));
      }),
    );

    return bundles
      .flat()
      .filter((row) => Boolean(row.value))
      .sort((a, b) => (b.issued || '').localeCompare(a.issued || ''));
  });

  return { observations: data ?? [], error, isLoading, isValidating };
}

function formatRestObsValue(
  value: string | number | boolean | { display?: string; uuid?: string } | undefined,
): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return value.display || '';
}
