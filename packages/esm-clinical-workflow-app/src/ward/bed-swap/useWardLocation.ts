import { type Location, openmrsFetch, restBaseUrl, type FetchResponse, useSession } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';

const isUUID = (value?: string) => {
  const regex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
  return regex.test(value ?? '');
};

function useLocation(locationUuid: string | null) {
  return useSWRImmutable<FetchResponse<Location>>(
    locationUuid ? `${restBaseUrl}/location/${locationUuid}?v=custom:(display,uuid)` : null,
    openmrsFetch,
  );
}

export function useWardLocation() {
  const { pathname } = window.location;
  const segment = pathname.split('/').at(-1);
  const locationUuidFromUrl = isUUID(segment) ? segment : null;
  const { sessionLocation } = useSession();
  const {
    data: locationResponse,
    isLoading: isLoadingLocation,
    error: errorFetchingLocation,
  } = useLocation(locationUuidFromUrl);

  return {
    location: locationUuidFromUrl ? locationResponse?.data : sessionLocation,
    isLoadingLocation,
    errorFetchingLocation,
  };
}
