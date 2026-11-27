import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';

export interface BillableServicePrice {
  uuid: string;
  price: number;
  paymentMode?: {
    uuid?: string;
    name?: string;
  };
}

export interface BillableServiceAvailability {
  serviceStatus: string;
  concept?: {
    uuid?: string;
    display?: string;
  };
  servicePrices?: Array<BillableServicePrice>;
}

/** One configured payment-method price for a catalog concept. */
export interface CatalogServicePrice {
  uuid: string;
  price: number;
  paymentModeName: string;
}

interface BillableServiceAvailabilityResponse {
  results: Array<BillableServiceAvailability>;
}

export type BillableAvailabilityLookup = ReadonlyMap<string, boolean>;

export type BillablePriceLookup = ReadonlyMap<string, Array<CatalogServicePrice>>;

const billableAvailabilityUrl = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,serviceStatus,concept:(uuid,display),servicePrices:(uuid,price,paymentMode:(uuid,name)))`;

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

export function createBillablePriceLookup(
  billableServices: Array<BillableServiceAvailability> = [],
): BillablePriceLookup {
  const lookup = new Map<string, Array<CatalogServicePrice>>();

  for (const service of billableServices) {
    const conceptUuid = service.concept?.uuid;
    if (!conceptUuid) {
      continue;
    }

    const prices = (service.servicePrices ?? [])
      .filter((price) => typeof price?.price === 'number' && Number.isFinite(price.price))
      .map((price) => ({
        uuid: price.uuid,
        price: price.price,
        paymentModeName: price.paymentMode?.name?.trim() ?? '',
      }));

    lookup.set(conceptUuid, prices);
  }

  return lookup;
}

export function useBillableAvailabilityLookup() {
  const { data, error, isLoading } = useSWR<FetchResponse<BillableServiceAvailabilityResponse>, Error>(
    billableAvailabilityUrl,
    openmrsFetch,
  );

  const services = data?.data?.results ?? [];
  const lookup = createBillableAvailabilityLookup(services);
  const prices = createBillablePriceLookup(services);

  return {
    lookup,
    prices,
    error,
    isLoading,
  };
}
