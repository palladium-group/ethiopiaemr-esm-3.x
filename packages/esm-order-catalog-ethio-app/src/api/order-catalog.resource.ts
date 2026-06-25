import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import { orderCatalogFullRepresentation } from './concept-representation';
import { parseOrderCatalogRoot } from './order-catalog.utils';
import { type CatalogConceptResponse, type CatalogTab } from '../types/order-catalog.types';
import type { BillableAvailabilityLookup } from './billable-availability.resource';

export function getOrderCatalogUrl(conceptUuid: string, locale: string): string {
  return `${restBaseUrl}/concept/${conceptUuid}?locale=${encodeURIComponent(
    locale,
  )}&v=${orderCatalogFullRepresentation}`;
}

export function useOrderCatalog(
  rootConceptUuid: string | undefined,
  locale: string,
  availabilityLookup?: BillableAvailabilityLookup,
) {
  const shouldFetch = Boolean(rootConceptUuid);
  const { data, error, isLoading, isValidating, mutate } = useSWR<FetchResponse<CatalogConceptResponse>, Error>(
    shouldFetch ? getOrderCatalogUrl(rootConceptUuid!, locale) : null,
    openmrsFetch,
    { revalidateOnFocus: false },
  );

  const tabs: Array<CatalogTab> | undefined = data?.data
    ? parseOrderCatalogRoot(data.data, locale, availabilityLookup)
    : undefined;

  return { tabs, error, isLoading, isValidating, mutate };
}
