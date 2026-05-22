import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { diagnosisHasMainAttribute, type DiagnosisAttributeLike } from './diagnosis-main.utils';

const ACTIVE_VISIT_FOR_MAIN_DIAGNOSIS_REP =
  'custom:(uuid,encounters:(uuid,diagnoses:(uuid,rank,voided,diagnosis:(coded:(uuid)),attributes:(uuid,attributeType:(uuid),value))))';

export interface VisitEncounterDiagnosisRow {
  rank?: number;
  voided?: boolean;
  diagnosis?: { coded?: { uuid?: string } };
  attributes?: ReadonlyArray<DiagnosisAttributeLike>;
}

export interface VisitEncounterRow {
  uuid: string;
  diagnoses?: VisitEncounterDiagnosisRow[];
}

export interface ActiveVisitWithEncounters {
  uuid: string;
  encounters?: VisitEncounterRow[];
}

export async function fetchActiveVisitWithEncounters(patientUuid: string): Promise<ActiveVisitWithEncounters | null> {
  const { data } = await openmrsFetch<{ results: ActiveVisitWithEncounters[] }>(
    `${restBaseUrl}/visit?patient=${patientUuid}&includeInactive=false&v=${ACTIVE_VISIT_FOR_MAIN_DIAGNOSIS_REP}`,
  );
  return data.results?.[0] ?? null;
}

/** Rank-1 (primary) diagnosis concept uuids across all encounters on the visit. */
export function collectVisitPrimaryConceptUuids(visit: ActiveVisitWithEncounters | null): string[] {
  const uuids = new Set<string>();
  for (const encounter of visit?.encounters ?? []) {
    for (const diagnosis of encounter.diagnoses ?? []) {
      if (!diagnosis.voided && diagnosis.rank === 1 && diagnosis.diagnosis?.coded?.uuid) {
        uuids.add(diagnosis.diagnosis.coded.uuid);
      }
    }
  }
  return Array.from(uuids);
}

/** True when another encounter on the visit already has a main diagnosis. */
export function visitHasMainDiagnosisOnOtherEncounter(
  visit: ActiveVisitWithEncounters | null,
  currentEncounterUuid: string | undefined,
  mainDiagnosisAttributeTypeUuid: string,
): boolean {
  for (const encounter of visit?.encounters ?? []) {
    if (currentEncounterUuid && encounter.uuid === currentEncounterUuid) {
      continue;
    }
    for (const diagnosis of encounter.diagnoses ?? []) {
      if (!diagnosis.voided && diagnosisHasMainAttribute(diagnosis.attributes, mainDiagnosisAttributeTypeUuid)) {
        return true;
      }
    }
  }
  return false;
}

export function useActiveVisitWithEncounters(patientUuid: string, activeVisitUuid: string | undefined) {
  const { data, error, isLoading } = useSWR(
    activeVisitUuid ? ['activeVisitWithEncounters', patientUuid, activeVisitUuid] : null,
    () => fetchActiveVisitWithEncounters(patientUuid),
  );

  return {
    visitWithEncounters: data ?? null,
    error,
    isLoading,
  };
}
