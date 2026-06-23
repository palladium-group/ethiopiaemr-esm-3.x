import { useCallback, useEffect, useMemo, useState } from 'react';
import isEqual from 'lodash-es/isEqual';
import useSWR, { useSWRConfig } from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import type { QueueEntry, QueueEntrySearchCriteria } from '../types';

type QueueEntryResponse = FetchResponse<{
  results: Array<QueueEntry>;
  links: Array<{
    rel: 'prev' | 'next';
    uri: string;
  }>;
  totalCount: number;
}>;

/**
 * Lean representation: only fields read by queue table columns and row actions.
 * Omits visit.encounters (obs, diagnoses, providers) which the table never displays.
 */
export const optimizedQueueEntryRep =
  'custom:(uuid,display,queue:(uuid,display,name,location:(uuid,display)),status:(uuid,display),patient:(uuid,display,person:(uuid,display,birthdate),identifiers:(uuid,display,identifier,identifierType:(uuid,display))),visit:(uuid,display,startDatetime,attributes:(uuid,display,value,attributeType:(uuid,display))),priority:(uuid,display),priorityComment,sortWeight,startedAt,endedAt,locationWaitingFor:(uuid,display),queueComingFrom:(uuid,display),providerWaitingFor:(uuid,display),previousQueueEntry:(uuid,display))';

function getInitialUrl(rep: string, searchCriteria?: QueueEntrySearchCriteria) {
  const searchParam = new URLSearchParams();
  searchParam.append('v', rep);
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

export function useMutateOptimizedQueueEntries() {
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

/**
 * Optimized alternative to the upstream useQueueEntries hook:
 * - Uses a trimmed REST representation
 * - Renders the table after the first page arrives (progressive loading)
 * - Does not force a refetch on mount
 */
export function useOptimizedQueueEntries(
  searchCriteria?: QueueEntrySearchCriteria,
  rep: string = optimizedQueueEntryRep,
) {
  const { mutateQueueEntries } = useMutateOptimizedQueueEntries();

  const [currentPage, setCurrentPage] = useState(0);
  const [currentRep, setCurrentRep] = useState(rep);
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState(searchCriteria);
  const [data, setData] = useState<Array<Array<QueueEntry>>>([]);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [pageUrl, setPageUrl] = useState<string | null>(getInitialUrl(currentRep, currentSearchCriteria));
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [waitingForMutate, setWaitingForMutate] = useState(false);
  const [hasReceivedFirstPage, setHasReceivedFirstPage] = useState(false);

  const refetchAllData = useCallback(
    (newRep: string = currentRep, newSearchCriteria: QueueEntrySearchCriteria = currentSearchCriteria) => {
      setWaitingForMutate(true);
      setCurrentPage(0);
      setData([]);
      setTotalCount(null);
      setHasReceivedFirstPage(false);
      setError(undefined);
      setPageUrl(getInitialUrl(newRep, newSearchCriteria));
    },
    [currentRep, currentSearchCriteria],
  );

  const refreshQueueEntries = useCallback(() => {
    setCurrentPage(0);
    setPageUrl(getInitialUrl(currentRep, currentSearchCriteria));
  }, [currentRep, currentSearchCriteria]);

  useEffect(() => {
    const isSearchCriteriaUpdated = !isEqual(currentSearchCriteria, searchCriteria);
    const isRepUpdated = currentRep !== rep;
    if (isSearchCriteriaUpdated || isRepUpdated) {
      if (isSearchCriteriaUpdated) {
        setCurrentSearchCriteria(searchCriteria);
      }
      if (isRepUpdated) {
        setCurrentRep(rep);
      }
      refetchAllData(rep, searchCriteria);
    }
  }, [currentRep, currentSearchCriteria, refetchAllData, rep, searchCriteria]);

  const { data: pageData, isValidating, error: pageError } = useSWR<QueueEntryResponse, Error>(pageUrl, openmrsFetch);

  useEffect(() => {
    const nextUrl = getNextUrlFromResponse(pageData);
    const stillWaitingForMutate = waitingForMutate && !isValidating;
    if (waitingForMutate && isValidating) {
      setWaitingForMutate(false);
    }
    if (pageData && !isValidating && !stillWaitingForMutate) {
      if (pageData?.data?.totalCount > -1 && pageData?.data?.totalCount !== totalCount) {
        setTotalCount(pageData.data.totalCount);
      }
      if (pageData?.data?.results) {
        setData((prevData) => {
          const newData = [...prevData];
          newData[currentPage] = pageData.data.results;
          return newData;
        });
        setHasReceivedFirstPage(true);
      }
      setCurrentPage((prevPage) => prevPage + 1);
      setPageUrl(nextUrl);
      const inMutateMode = data.length > currentPage;
      if (inMutateMode && nextUrl) {
        setWaitingForMutate(true);
      }
    }
    if (!nextUrl) {
      if (data.length > currentPage + 1) {
        setData((prevData) => {
          const newData = [...prevData];
          newData.splice(currentPage + 1);
          return newData;
        });
      }
    }
  }, [pageData, data, currentPage, totalCount, waitingForMutate, isValidating]);

  useEffect(() => {
    if (pageError) {
      setError(pageError);
    }
  }, [pageError]);

  const queueUpdateListener = useCallback(() => {
    refreshQueueEntries();
  }, [refreshQueueEntries]);

  useEffect(() => {
    window.addEventListener('queue-entry-updated', queueUpdateListener);
    return () => window.removeEventListener('queue-entry-updated', queueUpdateListener);
  }, [queueUpdateListener]);

  const queueEntries = useMemo(() => data.flat(), [data]);
  const isFetchingMore = totalCount != null && totalCount > 0 && queueEntries.length < totalCount;

  return {
    queueEntries,
    totalCount,
    isLoading: !hasReceivedFirstPage && !error,
    isValidating: isValidating || isFetchingMore,
    isFetchingMore,
    error,
    mutate: mutateQueueEntries,
  };
}
