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

type LocationResponse = {
  uuid: string;
  tags?: Array<{ uuid: string; display?: string }>;
};

interface PaginationParams {
  startIndex?: number;
  limit?: number;
  skip?: boolean;
}

const VISIT_CUSTOM_REPRESENTATION =
  'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),attributes:(uuid,value,attributeType:(uuid)),startDatetime,stopDatetime)';

const LOCATION_TAGS_REPRESENTATION = 'custom:(uuid,tags:(uuid,display))';

export interface BuildScoreboardVisitsUrlOptions {
  sessionLocation?: string;
  shouldFilterByLocation: boolean;
  assignedQueueAttributeTypeUuid?: string;
  includeInactive: boolean;
  totalCount?: boolean;
  fromStartDate?: string;
  representation?: string;
  startIndex?: number;
  limit?: number;
}

export function buildScoreboardVisitsUrl({
  sessionLocation,
  shouldFilterByLocation,
  assignedQueueAttributeTypeUuid,
  includeInactive,
  totalCount,
  fromStartDate,
  representation = VISIT_CUSTOM_REPRESENTATION,
  startIndex,
  limit,
}: BuildScoreboardVisitsUrlOptions): string | null {
  if (!sessionLocation) {
    return null;
  }

  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('includeParentLocations', 'true');
  urlSearchParams.append('includeInactive', String(includeInactive));
  if (totalCount) {
    urlSearchParams.append('totalCount', 'true');
  }
  if (fromStartDate) {
    urlSearchParams.append('fromStartDate', fromStartDate);
  }

  const useQueueAttr = shouldFilterByLocation && assignedQueueAttributeTypeUuid;
  const baseUrl = useQueueAttr ? `${restBaseUrl}/ethiopiaemrcustommodule/visit` : `${restBaseUrl}/visit`;

  if (useQueueAttr) {
    urlSearchParams.append('attributeType', assignedQueueAttributeTypeUuid);
    urlSearchParams.append('attributeValue', sessionLocation);
  } else if (shouldFilterByLocation) {
    urlSearchParams.append('location', sessionLocation);
  } else if (limit === undefined) {
    urlSearchParams.append('limit', String(MRU_VISITS_FETCH_LIMIT));
  }

  if (startIndex !== undefined) {
    urlSearchParams.append('startIndex', String(startIndex));
  }
  if (limit !== undefined) {
    urlSearchParams.append('limit', String(limit));
  }

  return `${baseUrl}?v=${representation}&${urlSearchParams.toString()}`;
}

export function useScoreboardLocationFilter() {
  const config = useConfig<ClinicalWorkflowConfig>();
  const session = useSession();
  const sessionLocation = session?.sessionLocation?.uuid;

  const locationUrl = sessionLocation
    ? `${restBaseUrl}/location/${sessionLocation}?v=${LOCATION_TAGS_REPRESENTATION}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: LocationResponse }>(locationUrl, openmrsFetch);

  const normalizedName = config?.medicalRecordingUnitLocationTagName?.trim().toLowerCase();
  const tagUuid = config?.medicalRecordingUnitLocationTagUuid;
  const isMruLocation =
    !isLoading &&
    !error &&
    Boolean(
      data?.data?.tags?.some(
        (t) => t.uuid === tagUuid || (normalizedName && t.display?.trim().toLowerCase() === normalizedName),
      ),
    );

  return {
    sessionLocation,
    shouldFilterByLocation: !isMruLocation,
    assignedQueueAttributeTypeUuid: config?.assignedQueueVisitAttributeTypeUuid,
  };
}

export const useActiveVisits = (paginationParams?: PaginationParams) => {
  const { sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid } = useScoreboardLocationFilter();
  const shouldSkip = paginationParams?.skip === true;

  const visitsUrl = useMemo(() => {
    if (shouldSkip) {
      return null;
    }

    return buildScoreboardVisitsUrl({
      sessionLocation,
      shouldFilterByLocation,
      assignedQueueAttributeTypeUuid,
      includeInactive: false,
      totalCount: true,
      startIndex: paginationParams?.startIndex,
      limit: paginationParams?.limit,
    });
  }, [
    shouldSkip,
    sessionLocation,
    shouldFilterByLocation,
    assignedQueueAttributeTypeUuid,
    paginationParams?.startIndex,
    paginationParams?.limit,
  ]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  return {
    visits: shouldSkip ? [] : data?.data?.results ?? [],
    count: shouldSkip ? 0 : data?.data?.totalCount ?? 0,
    error: shouldSkip ? null : error,
    isLoading: shouldSkip ? false : isLoading,
  };
};

// Fetch all visits for today without pagination, then filter locally for completed visits
export const useTotalVisits = (paginationParams?: PaginationParams) => {
  const { sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid } = useScoreboardLocationFilter();
  const startDate = dayjs().format('YYYY-MM-DD');
  const shouldSkip = paginationParams?.skip === true;

  const visitsUrl = useMemo(() => {
    if (shouldSkip) {
      return null;
    }

    return buildScoreboardVisitsUrl({
      sessionLocation,
      shouldFilterByLocation,
      assignedQueueAttributeTypeUuid,
      includeInactive: true,
      fromStartDate: startDate,
      limit: MRU_VISITS_FETCH_LIMIT,
    });
  }, [shouldSkip, sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid, startDate]);

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const completedTodayVisits = data?.data?.results?.filter((visit) => Boolean(visit.stopDatetime)) ?? [];

  return {
    visits: shouldSkip ? [] : completedTodayVisits,
    count: completedTodayVisits.length,
    error,
    isLoading,
  };
};

// Past visits are completed visits started today
export const usePastVisits = useTotalVisits;

// Fetch all visits for today (for score cards) - fetch all without pagination, filter locally
export const useTodayVisits = () => {
  const { sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid } = useScoreboardLocationFilter();
  const startDate = dayjs().format('YYYY-MM-DD');

  const visitsUrl = useMemo(
    () =>
      buildScoreboardVisitsUrl({
        sessionLocation,
        shouldFilterByLocation,
        assignedQueueAttributeTypeUuid,
        includeInactive: true,
        fromStartDate: startDate,
        limit: MRU_VISITS_FETCH_LIMIT,
      }),
    [sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid, startDate],
  );

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const allTodayVisits = data?.data?.results ?? [];
  const activeVisits = allTodayVisits.filter((visit) => !visit.stopDatetime);
  const pastVisits = allTodayVisits.filter((visit) => Boolean(visit.stopDatetime));

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

// Hook to get count of all active visits (for card display)
export const useActiveVisitsCount = () => {
  const { sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid } = useScoreboardLocationFilter();

  const visitsUrl = useMemo(
    () =>
      buildScoreboardVisitsUrl({
        sessionLocation,
        shouldFilterByLocation,
        assignedQueueAttributeTypeUuid,
        includeInactive: false,
        totalCount: true,
        limit: 1,
        representation: 'custom:(uuid)',
      }),
    [sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid],
  );

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  return {
    count: data?.data?.totalCount ?? 0,
    error,
    isLoading,
  };
};

// Hook to get count of all completed visits from today (for card display)
export const useTotalVisitsCount = () => {
  const { sessionLocation, shouldFilterByLocation, assignedQueueAttributeTypeUuid } = useScoreboardLocationFilter();
  const startDate = dayjs().format('YYYY-MM-DD');

  const visitsUrl = useMemo(
    () =>
      buildScoreboardVisitsUrl({
        sessionLocation,
        shouldFilterByLocation,
        assignedQueueAttributeTypeUuid,
        includeInactive: true,
        fromStartDate: startDate,
        limit: MRU_VISITS_FETCH_LIMIT,
        representation: 'custom:(uuid,stopDatetime)',
      }),
    [sessionLocation, startDate, shouldFilterByLocation, assignedQueueAttributeTypeUuid],
  );

  const { data, error, isLoading } = useSWR<{ data: VisitResponse }>(visitsUrl, openmrsFetch);

  const completedTodayCount = data?.data?.results?.filter((visit) => Boolean(visit.stopDatetime)).length ?? 0;

  return {
    count: completedTodayCount,
    error,
    isLoading,
  };
};
