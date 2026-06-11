import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useDebounce } from '@openmrs/esm-framework';
import type { DrugSearchResult } from '../types';

const drugSearchRepresentation = 'custom:(uuid,display,name,concept:(uuid,display))';

export function useDrugSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  const shouldFetch = debouncedQuery.trim().length >= 2;

  const { data, error, isLoading } = useSWR<{ data: { results: Array<DrugSearchResult> } }, Error>(
    shouldFetch ? ['orders-admin-drug-search', debouncedQuery] : null,
    () => openmrsFetch(`${restBaseUrl}/drug?q=${encodeURIComponent(debouncedQuery)}&v=${drugSearchRepresentation}`),
  );

  return useMemo(
    () => ({
      drugs: data?.data?.results ?? [],
      error,
      isLoading: shouldFetch && isLoading,
    }),
    [data, error, isLoading, shouldFetch],
  );
}
