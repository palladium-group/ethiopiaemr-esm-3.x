import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, useConfig, useSession } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { buildTriageActiveVisitsUrl } from './triage.resource';
import type { VisitResponse } from '../patient-scoreboard/hooks/useVisitList';

interface PaginationParams {
  startIndex?: number;
  limit?: number;
  skip?: boolean;
}

export const useTriageActiveVisits = (triageId: string | undefined, paginationParams?: PaginationParams) => {
  const session = useSession();
  const { triageVisitAttributeTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const sessionLocation = session?.sessionLocation?.uuid;
  const shouldSkip = paginationParams?.skip === true || !triageId || !triageVisitAttributeTypeUuid;

  const visitsUrl = useMemo(() => {
    if (shouldSkip || !sessionLocation || !triageId) {
      return null;
    }

    return buildTriageActiveVisitsUrl({
      sessionLocation,
      attributeTypeUuid: triageVisitAttributeTypeUuid,
      triageId,
      startIndex: paginationParams?.startIndex,
      limit: paginationParams?.limit,
    });
  }, [
    shouldSkip,
    sessionLocation,
    triageVisitAttributeTypeUuid,
    triageId,
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
