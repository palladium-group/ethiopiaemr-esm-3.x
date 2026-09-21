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
  field: string;
  conceptUuid: string;
  value: string;
  encounterUuid: string;
  encounterDisplay: string;
  encounterDatetime: string;
};

export type PathologyResultEncounterGroup = {
  encounterUuid: string;
  encounterDisplay: string;
  encounterDatetime: string;
  observations: Array<PathologyResultObservation>;
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
    encounter?: {
      uuid?: string;
      display?: string;
      encounterDatetime?: string;
    };
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
 * Fetches patient Observations for the given result-form concept-set members, grouped by encounter.
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
            `&v=custom:(uuid,display,obsDatetime,value,concept:(uuid,display),encounter:(uuid,display,encounterDatetime))`,
        );
        return (response.data?.results ?? []).map((obs) => {
          const encounterUuid = obs.encounter?.uuid || '';
          const encounterDatetime = obs.encounter?.encounterDatetime || obs.obsDatetime || '';
          return {
            id: obs.uuid,
            issued: obs.obsDatetime || '',
            field: displayByConcept[conceptUuid] || obs.concept?.display || 'Result',
            conceptUuid,
            value: formatRestObsValue(obs.value),
            encounterUuid,
            encounterDisplay: obs.encounter?.display || '',
            encounterDatetime,
          };
        });
      }),
    );

    return bundles.flat().filter((row) => Boolean(row.value));
  });

  const encounterGroups = useMemo(() => groupObservationsByEncounter(data ?? []), [data]);

  return {
    observations: data ?? [],
    encounterGroups,
    error,
    isLoading,
    isValidating,
  };
}

function groupObservationsByEncounter(
  observations: Array<PathologyResultObservation>,
): Array<PathologyResultEncounterGroup> {
  const groups = new Map<string, PathologyResultEncounterGroup>();

  for (const observation of observations) {
    const groupKey = observation.encounterUuid || `obs:${observation.id}`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.observations.push(observation);
      continue;
    }
    groups.set(groupKey, {
      encounterUuid: observation.encounterUuid,
      encounterDisplay: observation.encounterDisplay,
      encounterDatetime: observation.encounterDatetime || observation.issued,
      observations: [observation],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      observations: [...group.observations].sort((a, b) => (a.field || '').localeCompare(b.field || '')),
    }))
    .sort((a, b) => (b.encounterDatetime || '').localeCompare(a.encounterDatetime || ''));
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
