import { useCallback, useEffect, useMemo, useState } from 'react';
import isEqual from 'lodash-es/isEqual';
import useSWR, { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import {
  fhirBaseUrl,
  getLocale,
  openmrsFetch,
  restBaseUrl,
  useFhirFetchAll,
  type FetchResponse,
} from '@openmrs/esm-framework';
import type { QueueEntry, QueueEntrySearchCriteria } from '../types';

type QueueEntryResponse = FetchResponse<{
  results: Array<QueueEntry>;
  links: Array<{
    rel: 'prev' | 'next';
    uri: string;
  }>;
  totalCount: number;
}>;

const queueEntryRep =
  'custom:(uuid,display,queue,status,patient:(uuid,display,person,identifiers:(uuid,display,identifier,identifierType)),visit:(uuid,display,startDatetime,encounters:(uuid,display,diagnoses,encounterDatetime,encounterType,obs,encounterProviders,voided),attributes:(uuid,display,value,attributeType)),priority,priorityComment,sortWeight,startedAt,endedAt,locationWaitingFor,queueComingFrom,providerWaitingFor,previousQueueEntry)';

function getInitialUrl(searchCriteria?: QueueEntrySearchCriteria) {
  const searchParam = new URLSearchParams();
  searchParam.append('v', queueEntryRep);
  searchParam.append('totalCount', 'true');

  if (searchCriteria) {
    for (const [key, value] of Object.entries(searchCriteria)) {
      if (value != null) {
        searchParam.append(key, value.toString());
      }
    }
  }

  return `${restBaseUrl}/queue-entry?${searchParam.toString()}`;
}

function getNextUrlFromResponse(data: QueueEntryResponse) {
  const next = data?.data?.links?.find((link) => link.rel === 'next');
  if (next) {
    const nextUrl = new URL(next.uri);
    if (nextUrl.origin === window.location.origin) {
      return nextUrl.toString();
    }
    return new URL(`${nextUrl.pathname}${nextUrl.search ? nextUrl.search : ''}`, window.location.origin).toString();
  }
  return null;
}

export function useMutateQueueEntries() {
  const { mutate } = useSWRConfig();

  return {
    mutateQueueEntries: () => {
      return mutate((key) => {
        return (
          typeof key === 'string' &&
          (key.includes(`${restBaseUrl}/queue-entry`) || key.includes(`${restBaseUrl}/visit-queue-entry`))
        );
      }).then(() => {
        window.dispatchEvent(new CustomEvent('queue-entry-updated'));
      });
    },
  };
}

export function useQueueEntries(searchCriteria?: QueueEntrySearchCriteria) {
  const { mutateQueueEntries } = useMutateQueueEntries();
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState(searchCriteria);
  const [data, setData] = useState<Array<Array<QueueEntry>>>([]);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [pageUrl, setPageUrl] = useState(getInitialUrl(currentSearchCriteria));
  const [totalCount, setTotalCount] = useState(0);
  const [waitingForMutate, setWaitingForMutate] = useState(false);

  const refetchAllData = useCallback(
    (newSearchCriteria: QueueEntrySearchCriteria = currentSearchCriteria) => {
      setWaitingForMutate(true);
      setCurrentPage(0);
      setPageUrl(getInitialUrl(newSearchCriteria));
    },
    [currentSearchCriteria],
  );

  useEffect(() => {
    if (!isEqual(currentSearchCriteria, searchCriteria)) {
      setCurrentSearchCriteria(searchCriteria);
      refetchAllData(searchCriteria);
    }
  }, [currentSearchCriteria, refetchAllData, searchCriteria]);

  const { data: pageData, isValidating, error: pageError } = useSWR<QueueEntryResponse, Error>(pageUrl, openmrsFetch);

  useEffect(() => {
    const nextUrl = getNextUrlFromResponse(pageData);
    const stillWaitingForMutate = waitingForMutate && !isValidating;
    if (waitingForMutate && isValidating) {
      setWaitingForMutate(false);
    }
    if (pageData && !isValidating && !stillWaitingForMutate) {
      if (pageData?.data?.totalCount > -1 && pageData?.data?.totalCount !== totalCount) {
        setTotalCount(pageData?.data?.totalCount);
      }
      if (pageData?.data?.results) {
        const newData = [...data];
        newData[currentPage] = pageData?.data?.results;
        setData(newData);
      }
      setCurrentPage(currentPage + 1);
      setPageUrl(nextUrl);
      const inMutateMode = data.length > currentPage;
      if (inMutateMode && nextUrl) {
        setWaitingForMutate(true);
      }
    }
    if (!nextUrl && data.length > currentPage + 1) {
      setData((prevData) => {
        const newData = [...prevData];
        newData.splice(currentPage + 1);
        return newData;
      });
    }
  }, [pageData, data, currentPage, totalCount, waitingForMutate, isValidating]);

  useEffect(() => {
    if (pageError) {
      setError(pageError);
    }
  }, [pageError]);

  const queueUpdateListener = useCallback(() => {
    refetchAllData();
  }, [refetchAllData]);

  useEffect(() => {
    window.addEventListener('queue-entry-updated', queueUpdateListener);
    return () => window.removeEventListener('queue-entry-updated', queueUpdateListener);
  }, [queueUpdateListener]);

  const queueEntries = useMemo(() => data.flat(), [data]);

  return {
    queueEntries,
    totalCount,
    isLoading: totalCount === undefined || (totalCount > 0 && queueEntries.length < totalCount),
    isValidating: isValidating || currentPage < data.length,
    error,
    mutate: mutateQueueEntries,
  };
}

export function useQueueLocations() {
  const apiUrl = `${fhirBaseUrl}/Location?_summary=data&_tag=queue location`;
  const { data, error, isLoading } = useFhirFetchAll<fhir.Location>(apiUrl);

  const queueLocations = useMemo(
    () => data?.map((location) => location).sort((a, b) => a.name.localeCompare(b.name, getLocale())) ?? [],
    [data],
  );

  return { queueLocations, isLoading, error };
}

interface Queue {
  uuid: string;
  display: string;
  service: {
    uuid: string;
    display: string;
  };
  allowedStatuses?: Array<{ uuid: string; display: string }>;
}

export function useQueues(locationUuid?: string) {
  const customRepresentation =
    'custom:(uuid,display,name,description,service:(uuid,display),allowedPriorities:(uuid,display),allowedStatuses:(uuid,display),location:(uuid,display))';
  const apiUrl = `${restBaseUrl}/queue?v=${customRepresentation}` + (locationUuid ? `&location=${locationUuid}` : '');

  const { data, ...rest } = useSWRImmutable<{ data: { results: Array<Queue> } }, Error>(apiUrl, openmrsFetch);

  const queues = useMemo(
    () => data?.data?.results.sort((a, b) => a.display.localeCompare(b.display, getLocale())) ?? [],
    [data?.data?.results],
  );

  return { queues, ...rest };
}

export function useQueueStatuses() {
  const { queues, isLoading } = useQueues();

  const statuses = useMemo(() => {
    const allStatuses = ([] as Array<{ uuid: string; display: string }>).concat(
      ...(queues ?? []).map((queue) => queue?.allowedStatuses ?? []),
    );
    const uuidSet = new Set<string>();
    const uniqueStatuses: Array<{ uuid: string; display: string }> = [];

    allStatuses.forEach((status) => {
      if (status?.uuid && !uuidSet.has(status.uuid)) {
        uuidSet.add(status.uuid);
        uniqueStatuses.push(status);
      }
    });

    return uniqueStatuses.sort((a, b) => a.display.localeCompare(b.display, getLocale()));
  }, [queues]);

  return { statuses, isLoadingQueueStatuses: isLoading };
}

export function getSelectedServiceUuidFromSession(): string | undefined {
  const value = sessionStorage.getItem('queueServiceUuid');
  return value || undefined;
}
