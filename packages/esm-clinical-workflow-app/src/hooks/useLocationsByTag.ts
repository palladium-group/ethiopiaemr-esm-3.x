import { useMemo } from 'react';
import { fhirBaseUrl, getLocale, useFhirFetchAll } from '@openmrs/esm-framework';

/**
 * Generic hook to fetch locations filtered by tag name(s)
 * @param tags - Single tag name or array of tag names (e.g., "Emergency" or ["Emergency", "IPD Emergency"])
 * @returns Sorted locations, loading state, and error
 */
export function useLocationsByTag(tags: string | string[]) {
  const tagNames = useMemo(() => {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    return tagArray
      .map((tag) => encodeURIComponent(tag))
      .filter(Boolean)
      .join(',');
  }, [tags]);

  const apiUrl = `${fhirBaseUrl}/Location?_summary=data&_tag=${tagNames}`;
  const { data, error, isLoading } = useFhirFetchAll<fhir.Location>(apiUrl);

  const locations = useMemo(() => data?.sort((a, b) => a.name.localeCompare(b.name, getLocale())) ?? [], [data]);

  return { locations, isLoading, error };
}
