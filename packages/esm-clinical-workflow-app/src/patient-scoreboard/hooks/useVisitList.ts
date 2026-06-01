import { useMemo } from 'react';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import { MRU_VISITS_FETCH_LIMIT } from '../../constants';

export interface VisitResponse {
  results: Array<Visit>;
  totalCount?: number;
}

type LocationTag = {
  uuid: string;
  display?: string;
};

type LocationResponse = {
  uuid: string;
  tags?: Array<LocationTag>;
};

interface PaginationParams {
  startIndex?: number;
  limit?: number;
  skip?: boolean;
}

const VISIT_CUSTOM_REPRESENTATION =
  'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

const LOCATION_TAGS_REPRESENTATION = 'custom:(uuid,tags:(uuid,display))';

function useMruLocationState() {
  const config = useConfig<ClinicalWorkflowConfig>();
  const session = useSession();
  const sessionLocationUuid = session?.sessionLocation?.uuid;

  const locationUrl = sessionLocationUuid
    ? `${restBaseUrl}/location/${sessionLocationUuid}?v=${LOCATION_TAGS_REPRESENTATION}`
    : null;

  const { data, error, isLoading } = useSWR<{ data: LocationResponse }>(locationUrl, openmrsFetch);

  const tags = data?.data?.tags ?? [];
  const normalizedName = config.medicalRecordingUnitLocationTagName?.trim().toLowerCase();
  const tagUuid = config.medicalRecordingUnitLocationTagUuid;

  const isMruLocation = tags.some((t) => {
    if (t.uuid === tagUuid) {
      return true;
    }
    if (normalizedName && t.display) {
      return t.display.trim().toLowerCase() === normalizedName;
    }
    return false;
  });

  return {
    isMruLocation,
    isLocationTagLoading: isLoading,
    locationTagError: error,
  };
}

/**
 * While the MRU tag check is pending, default to location-filtered (non-MRU) so visit
 * fetches can start immediately. Re-fetches without location once MRU is confirmed.
 */
function getShouldFilterByLocation(
  isMruLocation: boolean,
  isLocationTagLoading: boolean,
  locationTagError: unknown,
): boolean {
  if (isLocationTagLoading || locationTagError) {
    return true;
  }
  return !isMruLocation;
}

function appendLocationFilter(params: URLSearchParams, sessionLocation: string, shouldFilterByLocation: boolean) {
  if (shouldFilterByLocation) {
    params.append('location', sessionLocation);
  }
}

function appendMruFetchLimit(params: URLSearchParams, shouldFilterByLocation: boolean) {
  if (!shouldFilterByLocation) {
    params.append('limit', String(MRU_VISITS_FETCH_LIMIT));
  }
}

export const useActiveVisits = (paginationParams?: PaginationParams) => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const { isMruLocation, isLocationTagLoading, locationTagError } = useMruLocationState();
  const shouldSkip = paginationParams?.skip === true;
  const shouldFilterByLocation = getShouldFilterByLocation(isMruLocation, isLocationTagLoading, locationTagError);

  const visitsUrl = useMemo(() => {
    if (shouldSkip || !sessionLocation) {
      return null;
    }

    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'false');
    urlSearchParams.append('totalCount', 'true');
    appendLocationFilter(urlSearchParams, sessionLocation, shouldFilterByLocation);

    if (paginationParams?.startIndex !== undefined) {
      urlSearchParams.append('startIndex', paginationParams.startIndex.toString());
    }
    if (paginationParams?.limit !== undefined) {
      urlSearchParams.append('limit', paginationParams.limit.toString());
    } else if (!shouldFilterByLocation) {
      appendMruFetchLimit(urlSearchParams, shouldFilterByLocation);
    }

    return `${restBaseUrl}/visit?v=${VISIT_CUSTOM_REPRESENTATION}&${urlSearchParams.toString()}`;
  }, [shouldSkip, sessionLocation, shouldFilterByLocation, paginationParams?.startIndex, paginationParams?.limit]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  return {
    visits: shouldSkip ? [] : data?.data?.results ?? [],
    count: shouldSkip ? 0 : data?.data?.totalCount ?? 0,
    error: shouldSkip ? null : error,
    isLoading: shouldSkip ? false : isLoading,
  };
};

// Fetch all past visits without pagination, then filter locally
export const usePastVisits = () => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const { isMruLocation, isLocationTagLoading, locationTagError } = useMruLocationState();
  const startDate = dayjs().format('YYYY-MM-DD');
  const shouldFilterByLocation = getShouldFilterByLocation(isMruLocation, isLocationTagLoading, locationTagError);

  const visitsUrl = useMemo(() => {
    if (!sessionLocation) {
      return null;
    }

    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('fromStartDate', startDate);
    appendLocationFilter(urlSearchParams, sessionLocation, shouldFilterByLocation);
    appendMruFetchLimit(urlSearchParams, shouldFilterByLocation);

    return `${restBaseUrl}/visit?v=${VISIT_CUSTOM_REPRESENTATION}&${urlSearchParams.toString()}`;
  }, [sessionLocation, startDate, shouldFilterByLocation]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const pastVisits =
    data?.data?.results?.filter((visit) => {
      return !!visit.stopDatetime;
    }) ?? [];

  return {
    visits: pastVisits,
    count: pastVisits.length,
    error,
    isLoading,
  };
};

// Fetch all visits for today (for score cards) - fetch all without pagination, filter locally
export const useTodayVisits = () => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const { isMruLocation, isLocationTagLoading, locationTagError } = useMruLocationState();
  const startDate = dayjs().format('YYYY-MM-DD');
  const shouldFilterByLocation = getShouldFilterByLocation(isMruLocation, isLocationTagLoading, locationTagError);

  const visitsUrl = useMemo(() => {
    if (!sessionLocation) {
      return null;
    }

    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('fromStartDate', startDate);
    appendLocationFilter(urlSearchParams, sessionLocation, shouldFilterByLocation);
    appendMruFetchLimit(urlSearchParams, shouldFilterByLocation);

    return `${restBaseUrl}/visit?v=${VISIT_CUSTOM_REPRESENTATION}&${urlSearchParams.toString()}`;
  }, [sessionLocation, startDate, shouldFilterByLocation]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const allTodayVisits = data?.data?.results ?? [];
  const activeVisits = allTodayVisits.filter((visit) => !visit.stopDatetime);
  const pastVisits = allTodayVisits.filter((visit) => !!visit.stopDatetime);

  return {
    allVisits: allTodayVisits,
    activeVisits,
    pastVisits,
    totalCount: allTodayVisits.length,
    activeCount: activeVisits.length,
    pastCount: pastVisits.length,
    error,
    isLoading,
  };
};

// Fetch all visits for today without pagination, then filter locally for completed visits
export const useTotalVisits = (paginationParams?: PaginationParams) => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const { isMruLocation, isLocationTagLoading, locationTagError } = useMruLocationState();
  const startDate = dayjs().format('YYYY-MM-DD');
  const shouldSkip = paginationParams?.skip === true;
  const shouldFilterByLocation = getShouldFilterByLocation(isMruLocation, isLocationTagLoading, locationTagError);

  const visitsUrl = useMemo(() => {
    if (!sessionLocation) {
      return null;
    }

    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('v', VISIT_CUSTOM_REPRESENTATION);
    urlSearchParams.append('fromStartDate', startDate);
    appendLocationFilter(urlSearchParams, sessionLocation, shouldFilterByLocation);
    appendMruFetchLimit(urlSearchParams, shouldFilterByLocation);

    return `${restBaseUrl}/visit?${urlSearchParams.toString()}`;
  }, [sessionLocation, startDate, shouldFilterByLocation]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const completedTodayVisits =
    data?.data?.results?.filter((visit) => {
      return !!visit.stopDatetime;
    }) ?? [];

  return {
    visits: shouldSkip ? [] : completedTodayVisits,
    count: completedTodayVisits.length,
    error,
    isLoading,
  };
};

// Hook to get count of all active visits (for card display)
export const useActiveVisitsCount = () => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const { isMruLocation, isLocationTagLoading, locationTagError } = useMruLocationState();
  const shouldFilterByLocation = getShouldFilterByLocation(isMruLocation, isLocationTagLoading, locationTagError);

  const visitsUrl = useMemo(() => {
    if (!sessionLocation) {
      return null;
    }

    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'false');
    urlSearchParams.append('totalCount', 'true');
    appendLocationFilter(urlSearchParams, sessionLocation, shouldFilterByLocation);
    urlSearchParams.append('limit', '1');

    return `${restBaseUrl}/visit?v=${VISIT_CUSTOM_REPRESENTATION}&${urlSearchParams.toString()}`;
  }, [sessionLocation, shouldFilterByLocation]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  return {
    count: data?.data?.totalCount ?? 0,
    error,
    isLoading,
  };
};

// Hook to get count of all completed visits from today (for card display)
export const useTotalVisitsCount = () => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const { isMruLocation, isLocationTagLoading, locationTagError } = useMruLocationState();
  const startDate = dayjs().format('YYYY-MM-DD');
  const shouldFilterByLocation = getShouldFilterByLocation(isMruLocation, isLocationTagLoading, locationTagError);

  const visitsUrl = useMemo(() => {
    if (!sessionLocation) {
      return null;
    }

    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('v', VISIT_CUSTOM_REPRESENTATION);
    urlSearchParams.append('fromStartDate', startDate);
    appendLocationFilter(urlSearchParams, sessionLocation, shouldFilterByLocation);
    appendMruFetchLimit(urlSearchParams, shouldFilterByLocation);

    return `${restBaseUrl}/visit?${urlSearchParams.toString()}`;
  }, [sessionLocation, startDate, shouldFilterByLocation]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const completedTodayCount =
    data?.data?.results?.filter((visit) => {
      return !!visit.stopDatetime;
    }).length ?? 0;

  return {
    count: completedTodayCount,
    error,
    isLoading,
  };
};
