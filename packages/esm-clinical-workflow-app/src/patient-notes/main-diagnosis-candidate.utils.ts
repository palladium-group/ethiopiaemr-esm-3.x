import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { conceptHasMappingToSource, type ConceptWithMappings } from './diagnosis-concept.utils';

const CONCEPT_RESOLUTION_REP =
  'custom:(uuid,display,conceptClass:(uuid,display,name),mappings:(conceptReferenceTerm:(conceptSource:(uuid),code)),parentSets:(conceptSet:(uuid,display,conceptClass:(uuid,display,name))))';

const DEFAULT_MAX_PARENT_HOPS = 10;

export interface MainDiagnosisCandidate {
  uuid: string;
  display: string;
}

export interface ResolveMainDiagnosisCandidateOptions {
  esvIcd11ConceptSourceUuid: string;
  /** Concept class UUID (same as `diagnosisConceptClass` in app config). */
  diagnosisConceptClass: string;
  maxParentHops?: number;
}

export interface ConceptForMainDiagnosisResolution extends ConceptWithMappings {
  conceptClass?: { uuid?: string; display?: string; name?: string };
  parentSets?: Array<{
    conceptSet?: {
      uuid?: string;
      display?: string;
      conceptClass?: { uuid?: string; display?: string; name?: string };
    };
  }>;
}

export async function fetchConceptForMainDiagnosisResolution(
  conceptUuid: string,
): Promise<ConceptForMainDiagnosisResolution> {
  const { data } = await openmrsFetch<ConceptForMainDiagnosisResolution>(
    `${restBaseUrl}/concept/${conceptUuid}?v=${CONCEPT_RESOLUTION_REP}`,
  );
  return data;
}

/** Immediate parent set concept (single parent chain assumed). */
export function getImmediateParentConceptUuid(concept: ConceptForMainDiagnosisResolution): string | undefined {
  return concept.parentSets?.[0]?.conceptSet?.uuid;
}

export function isDiagnosisClassConcept(
  concept: ConceptForMainDiagnosisResolution,
  diagnosisConceptClass: string,
): boolean {
  const conceptClass = concept.conceptClass;
  if (!conceptClass) {
    return false;
  }
  if (diagnosisConceptClass && conceptClass.uuid === diagnosisConceptClass) {
    return true;
  }
  const name = conceptClass.name?.toLowerCase() ?? conceptClass.display?.toLowerCase();
  return name === 'diagnosis';
}

function toCandidate(concept: ConceptForMainDiagnosisResolution): MainDiagnosisCandidate {
  return { uuid: concept.uuid, display: concept.display };
}

/**
 * Resolves one main-diagnosis candidate from a primary concept:
 * - If primary is mapped to ESV → that primary.
 * - Else walk up the parent set chain; return the first ancestor that is both Diagnosis-class
 *   and mapped to ESV, or null when the chain is exhausted.
 */
export async function resolveMainDiagnosisCandidateForPrimary(
  primaryConceptUuid: string,
  options: ResolveMainDiagnosisCandidateOptions,
): Promise<MainDiagnosisCandidate | null> {
  const { esvIcd11ConceptSourceUuid, diagnosisConceptClass, maxParentHops = DEFAULT_MAX_PARENT_HOPS } = options;

  const primary = await fetchConceptForMainDiagnosisResolution(primaryConceptUuid);

  if (conceptHasMappingToSource(primary, esvIcd11ConceptSourceUuid)) {
    return toCandidate(primary);
  }

  let parentUuid = getImmediateParentConceptUuid(primary);
  let hops = 0;

  while (parentUuid && hops < maxParentHops) {
    const ancestor = await fetchConceptForMainDiagnosisResolution(parentUuid);

    if (
      isDiagnosisClassConcept(ancestor, diagnosisConceptClass) &&
      conceptHasMappingToSource(ancestor, esvIcd11ConceptSourceUuid)
    ) {
      return toCandidate(ancestor);
    }

    parentUuid = getImmediateParentConceptUuid(ancestor);
    hops += 1;
  }

  return null;
}

/** Union of candidates for all primaries, deduped by concept uuid. */
export async function resolveMainDiagnosisCandidatesForPrimaries(
  primaryConceptUuids: Array<string>,
  options: ResolveMainDiagnosisCandidateOptions,
): Promise<Array<MainDiagnosisCandidate>> {
  const byUuid = new Map<string, MainDiagnosisCandidate>();

  await Promise.all(
    primaryConceptUuids.map(async (uuid) => {
      const candidate = await resolveMainDiagnosisCandidateForPrimary(uuid, options);
      if (candidate) {
        byUuid.set(candidate.uuid, candidate);
      }
    }),
  );

  return Array.from(byUuid.values()).sort((a, b) => a.display.localeCompare(b.display));
}
