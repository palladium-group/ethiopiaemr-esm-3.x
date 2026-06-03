import type { Concept } from './types';

export interface ConceptWithMappings extends Concept {
  mappings?: Array<{
    conceptReferenceTerm?: {
      conceptSource?: { uuid?: string };
    };
  }>;
}

export function conceptHasMappingToSource(concept: ConceptWithMappings, conceptSourceUuid: string): boolean {
  if (!conceptSourceUuid) {
    return false;
  }
  return (
    concept.mappings?.some((mapping) => mapping.conceptReferenceTerm?.conceptSource?.uuid === conceptSourceUuid) ??
    false
  );
}
