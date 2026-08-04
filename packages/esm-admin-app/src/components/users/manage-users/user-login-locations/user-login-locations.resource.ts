import { useMemo } from 'react';
import useSWR from 'swr';
import { fhirBaseUrl, restBaseUrl, openmrsFetch, type FetchResponse } from '@openmrs/esm-framework';

export interface LoginLocation {
  uuid: string;
  name: string;
}

interface FhirLocationBundle {
  entry?: Array<{ resource: { id: string; name: string } }>;
}

interface UserLocationRestResponse {
  results: Array<{ location: { uuid: string; display: string } }>;
}

/**
 * All locations tagged "Login Location" — the candidate pool an admin can map a user to,
 * matching what the login picker and the backend enforcement filter resolve against.
 */
export function useTaggedLoginLocations() {
  const url = `${fhirBaseUrl}/Location?_tag=Login+Location&_count=1000`;
  const { data, error, isLoading } = useSWR<FetchResponse<FhirLocationBundle>>(url, openmrsFetch);

  return useMemo(
    () => ({
      locations: (data?.data?.entry ?? []).map((entry) => ({ uuid: entry.resource.id, name: entry.resource.name })),
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );
}

/**
 * The user's raw login-location mappings (possibly empty). The collection endpoint returns the
 * raw {@code user_location} rows as {@code {location: {uuid, display}}} — no query params, since
 * the REST framework routes any non-standard param to search-handler dispatch, which this
 * subresource does not support.
 */
export function useUserLoginLocationMappings(userUuid: string) {
  const url = `${restBaseUrl}/user/${userUuid}/location`;
  const { data, error, isLoading } = useSWR<FetchResponse<UserLocationRestResponse>>(url, openmrsFetch);

  return useMemo(
    () => ({
      mappings: (data?.data?.results ?? []).map((result) => ({
        uuid: result.location.uuid,
        name: result.location.display,
      })),
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );
}

/**
 * Persists the diff between the user's current and newly selected login locations:
 * POST for additions, DELETE for removals.
 */
export function saveUserLoginLocations(userUuid: string, currentUuids: Array<string>, selectedUuids: Array<string>) {
  const current = new Set(currentUuids);
  const selected = new Set(selectedUuids);

  const additions = selectedUuids.filter((uuid) => !current.has(uuid));
  const removals = currentUuids.filter((uuid) => !selected.has(uuid));

  return Promise.all([
    ...additions.map((uuid) =>
      openmrsFetch(`${restBaseUrl}/user/${userUuid}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { location: uuid },
      }),
    ),
    ...removals.map((uuid) =>
      openmrsFetch(`${restBaseUrl}/user/${userUuid}/location/${uuid}`, {
        method: 'DELETE',
      }),
    ),
  ]);
}
