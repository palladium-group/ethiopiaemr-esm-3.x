import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type LocationResponse } from '../types';

export type LocationListItem = LocationResponse & {
  retired?: boolean;
  parentLocation?: { uuid: string; display: string } | null;
};

const locationRepresentation = encodeURIComponent(
  'custom:(uuid,display,name,description,retired,tags:(uuid,display,name),parentLocation:(uuid,display),attributes:(uuid,attributeType:(uuid,display),value))',
);

interface UsePagedLocationsParams {
  searchTerm?: string;
  /** Only locations carrying this tag (uuid or name). */
  tag?: string;
  page?: number;
  pageSize?: number;
}

/**
 * One server-side page of non-retired locations. `q` matches the location name; `tag` and `q` can be combined.
 * Keys start with `${restBaseUrl}/location` so the add/edit/tag workspaces' prefix mutations refresh the table.
 */
export const usePagedLocations = ({ searchTerm = '', tag = '', page = 1, pageSize = 10 }: UsePagedLocationsParams) => {
  const startIndex = (page - 1) * pageSize;
  const trimmedSearch = searchTerm.trim();
  const url =
    `${restBaseUrl}/location?v=${locationRepresentation}&startIndex=${startIndex}&limit=${pageSize}&totalCount=true` +
    (trimmedSearch ? `&q=${encodeURIComponent(trimmedSearch)}` : '') +
    (tag ? `&tag=${encodeURIComponent(tag)}` : '');

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    FetchResponse<{ results: Array<LocationListItem>; totalCount?: number }>
  >(url, openmrsFetch, { keepPreviousData: true, errorRetryCount: 2 });

  const results = data?.data?.results;
  return {
    locations: results ?? [],
    totalCount: data?.data?.totalCount ?? results?.length ?? 0,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};
