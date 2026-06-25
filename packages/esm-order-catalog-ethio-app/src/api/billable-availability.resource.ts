import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';

export interface BillableServiceAvailability {
  serviceStatus: string;
  concept?: {
    uuid?: string;
    display?: string;
  };
}

interface BillableServiceAvailabilityResponse {
  results: Array<BillableServiceAvailability>;
}

export type BillableAvailabilityLookup = ReadonlyMap<string, boolean>;

const billableAvailabilityUrl = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,serviceStatus,concept:(uuid,display))`;

export function createBillableAvailabilityLookup(
  billableServices: Array<BillableServiceAvailability> = [],
): BillableAvailabilityLookup {
  const lookup = new Map<string, boolean>();

  for (const service of billableServices) {
    const conceptUuid = service.concept?.uuid;
    if (!conceptUuid) {
      continue;
    }
    lookup.set(conceptUuid, service.serviceStatus === 'ENABLED');
  }

  return lookup;
}

export function useBillableAvailabilityLookup() {
  const { data, error, isLoading } = useSWR<FetchResponse<BillableServiceAvailabilityResponse>, Error>(
    billableAvailabilityUrl,
    openmrsFetch,
  );

  const lookup = createBillableAvailabilityLookup(data?.data?.results ?? []);

  return {
    lookup,
    error,
    isLoading,
  };
}
