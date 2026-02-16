import dayjs from 'dayjs';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useSession, type Visit } from '@openmrs/esm-framework';

export interface VisitResponse {
  results: Array<Visit>;
  totalCount?: number;
}

interface PaginationParams {
  startIndex?: number;
  limit?: number;
  skip?: boolean;
}

export const useActiveVisits = (paginationParams?: PaginationParams) => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const startDate = dayjs().format('YYYY-MM-DD');
  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

  const shouldSkip = paginationParams?.skip === true;

  const getUrl = () => {
    if (shouldSkip || !sessionLocation) {
      return null;
    }
    let url = `${restBaseUrl}/visit?v=${customRepresentation}&`;
    let urlSearchParams = new URLSearchParams();

    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'false');
    urlSearchParams.append('fromStartDate', startDate);
    urlSearchParams.append('totalCount', 'true');
    urlSearchParams.append('location', `${sessionLocation}`);

    // Add pagination parameters
    if (paginationParams?.startIndex !== undefined) {
      urlSearchParams.append('startIndex', paginationParams.startIndex.toString());
    }
    if (paginationParams?.limit !== undefined) {
      urlSearchParams.append('limit', paginationParams.limit.toString());
    }

    return url + urlSearchParams.toString();
  };

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(getUrl, openmrsFetch);

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
  const startDate = dayjs().format('YYYY-MM-DD');
  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

  const getUrl = () => {
    if (!sessionLocation) {
      return null;
    }
    let url = `${restBaseUrl}/visit?v=${customRepresentation}&`;
    let urlSearchParams = new URLSearchParams();

    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('fromStartDate', startDate);
    urlSearchParams.append('location', `${sessionLocation}`);
    // Don't add pagination parameters - fetch all

    return url + urlSearchParams.toString();
  };

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(getUrl, openmrsFetch);

  // Filter visits that are inactive (have stopDatetime)
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
  const startDate = dayjs().format('YYYY-MM-DD');
  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

  const getUrl = () => {
    if (!sessionLocation) {
      return null;
    }
    let url = `${restBaseUrl}/visit?v=${customRepresentation}&`;
    let urlSearchParams = new URLSearchParams();

    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('fromStartDate', startDate);
    urlSearchParams.append('location', `${sessionLocation}`);
    // Don't add pagination parameters - fetch all

    return url + urlSearchParams.toString();
  };

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(getUrl, openmrsFetch);

  const allTodayVisits = data?.data?.results ?? [];

  // Filter active visits (no stopDatetime)
  const activeVisits = allTodayVisits.filter((visit) => !visit.stopDatetime);

  // Filter past visits (have stopDatetime)
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

export const useTotalVisits = (paginationParams?: PaginationParams) => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const startDate = dayjs().format('YYYY-MM-DD');
  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

  const getUrl = () => {
    if (!sessionLocation) {
      return null;
    }
    let url = `${restBaseUrl}/visit?`;
    let urlSearchParams = new URLSearchParams();

    urlSearchParams.append('includeInactive', 'true');
    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('v', customRepresentation);
    urlSearchParams.append('fromStartDate', startDate);
    urlSearchParams.append('location', sessionLocation);
    urlSearchParams.append('totalCount', 'true');

    // Add pagination parameters
    if (paginationParams?.startIndex !== undefined) {
      urlSearchParams.append('startIndex', paginationParams.startIndex.toString());
    }
    if (paginationParams?.limit !== undefined) {
      urlSearchParams.append('limit', paginationParams.limit.toString());
    }

    return url + urlSearchParams.toString();
  };

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(getUrl, openmrsFetch);

  return {
    visits: data?.data?.results ?? [],
    count: data?.data?.totalCount ?? 0,
    error,
    isLoading,
  };
};
