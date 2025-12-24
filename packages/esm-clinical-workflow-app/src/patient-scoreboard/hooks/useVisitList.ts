import dayjs from 'dayjs';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useSession, type Visit } from '@openmrs/esm-framework';

export interface VisitResponse {
  results: Array<Visit>;
  totalCount?: number;
}

export const useActiveVisits = () => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

  const getUrl = () => {
    if (!sessionLocation) {
      return null;
    }
    let url = `${restBaseUrl}/visit?v=${customRepresentation}&`;
    let urlSearchParams = new URLSearchParams();

    urlSearchParams.append('includeParentLocations', 'true');
    urlSearchParams.append('includeInactive', 'false');
    urlSearchParams.append('totalCount', 'true');
    urlSearchParams.append('location', `${sessionLocation}`);

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

export const useScheduledVisits = () => {
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

    return url + urlSearchParams.toString();
  };

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(getUrl, openmrsFetch);

  // Filter visits that started today but are now inactive (stopped)
  const scheduledVisits =
    data?.data?.results?.filter((visit) => {
      const startedToday = dayjs(visit.startDatetime).isSame(dayjs(), 'day');
      const isStopped = !!visit.stopDatetime;
      return startedToday && isStopped;
    }) ?? [];

  return {
    visits: scheduledVisits,
    count: scheduledVisits.length,
    error,
    isLoading,
  };
};

export const useTotalVisits = () => {
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;
  const startDate = dayjs().format('YYYY-MM-DD');
  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

  const getUrl = () => {
    if (!sessionLocation) {
      return null;
    }
    const visitsUrl = `${restBaseUrl}/visit?includeInactive=true&includeParentLocations=true&v=${customRepresentation}&fromStartDate=${startDate}&location=${sessionLocation}`;
    return visitsUrl;
  };

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(getUrl, openmrsFetch);

  return {
    visits: data?.data?.results ?? [],
    count: data?.data?.results?.length ?? 0,
    error,
    isLoading,
  };
};
