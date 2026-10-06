import { useMemo } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';

interface VisitAttribute {
  uuid: string;
  value: string;
  attributeType?: {
    uuid: string;
  };
}

interface VisitItem {
  uuid: string;
  startDatetime?: string;
  stopDatetime?: string | null;
  attributes?: VisitAttribute[];
}

export interface LastVisitPaymentMethodResult {
  lastVisitPaymentMethodUuid: string | null;
  isLoading: boolean;
  error?: Error;
}

const PAST_VISIT_ATTRIBUTES_REP =
  'custom:(uuid,startDatetime,stopDatetime,attributes:(uuid,value,attributeType:(uuid)))';

/**
 * Fetches previous closed visits for the patient and extracts the
 * paymentMethod visit attribute UUID from the most recent closed visit.
 *
 * Used in MRU billing workspace to auto-populate the payment method
 * when the patient returns within a valid consultation card window.
 */
export function useLastVisitPaymentMethod(
  patientUuid?: string | null,
  paymentMethodAttrTypeUuid?: string | null,
): LastVisitPaymentMethodResult {
  const shouldFetch = Boolean(patientUuid && paymentMethodAttrTypeUuid);
  const url = shouldFetch
    ? `${restBaseUrl}/visit?patient=${patientUuid}&includeInactive=true&v=${PAST_VISIT_ATTRIBUTES_REP}`
    : null;

  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<VisitItem> }>, Error>(url, openmrsFetch, {
    dedupingInterval: 10_000,
    revalidateOnFocus: false,
  });

  return useMemo<LastVisitPaymentMethodResult>(() => {
    if (!shouldFetch) {
      return {
        lastVisitPaymentMethodUuid: null,
        isLoading: false,
        error,
      };
    }

    if (isLoading) {
      return {
        lastVisitPaymentMethodUuid: null,
        isLoading: true,
        error,
      };
    }

    const visits = data?.data?.results ?? [];

    // Filter to closed visits only and sort by stopDatetime desc, then startDatetime desc
    const closedVisits = visits
      .filter((v) => Boolean(v.stopDatetime))
      .sort((a, b) => {
        const timeB = dayjs(b.stopDatetime || b.startDatetime).valueOf();
        const timeA = dayjs(a.stopDatetime || a.startDatetime).valueOf();
        return timeB - timeA;
      });

    // Find the first closed visit that has the paymentMethod attribute
    for (const visit of closedVisits) {
      const match = visit.attributes?.find(
        (attr) => attr.attributeType?.uuid === paymentMethodAttrTypeUuid && Boolean(attr.value),
      );
      if (match?.value) {
        return {
          lastVisitPaymentMethodUuid: match.value,
          isLoading: false,
          error,
        };
      }
    }

    return {
      lastVisitPaymentMethodUuid: null,
      isLoading: false,
      error,
    };
  }, [shouldFetch, isLoading, data?.data?.results, paymentMethodAttrTypeUuid, error]);
}
