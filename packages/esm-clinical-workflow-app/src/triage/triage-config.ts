import type { TriageDefinitionConfig } from '../config-schema';

export function getTriageRoutePath(def: TriageDefinitionConfig): string {
  const custom = def.routePath?.trim();
  return custom || `${def.id}-triage`;
}

export function findTriageDefinition(
  definitions: Array<TriageDefinitionConfig> | undefined,
  triageId: string,
): TriageDefinitionConfig | undefined {
  return definitions?.find((d) => d.id === triageId);
}

/**
 * Resolves which triage definition applies to the current URL (last path segment
 * matches `getTriageRoutePath` for a configured definition).
 */
export function resolveTriageIdFromPathname(
  pathname: string,
  definitions: Array<TriageDefinitionConfig> | undefined,
): string | undefined {
  if (!definitions?.length) {
    return undefined;
  }
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) {
    return undefined;
  }
  for (const def of definitions) {
    if (getTriageRoutePath(def) === last) {
      return def.id;
    }
  }
  return undefined;
}
