import { Concept, openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { ServiceConcept, ServiceTypesResponse } from '../../types';
import { type ChargeAble } from './charge-summary.resource';
import { useMemo, useState } from 'react';

type ExtendedResponseObject = ChargeAble & {
  concept: Concept;
};

type ResponseObject = {
  results: Array<ExtendedResponseObject>;
};
export interface ServiceTableFilters {
  types: string[];
  available: 'all' | 'ENABLED' | 'DISABLED';
}

const DEFAULT_FILTERS: ServiceTableFilters = {
  types: [],
  available: 'all',
};

export const useBillableServices = () => {
  const url = `/ws/rest/v1/cashier/billableService?v=custom:(uuid,name,shortName,stockItem:(uuid, display),serviceStatus,serviceType:(uuid,display),servicePrices:(uuid,name,paymentMode,price),concept:(uuid,display))`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<{ data: ResponseObject }>(url, openmrsFetch, {});
  return { billableServices: data?.data.results ?? [], isLoading, isValidating, error, mutate };
};

export function useServiceTypes() {
  // service concept UUID containing all available services e.g lab, pharmacy, surgical etc
  const serviceConceptUuid = `d7bd4cc0-90b1-4f22-90f2-ab7fde936727`;
  const url = `/ws/rest/v1/concept/${serviceConceptUuid}?v=custom:(setMembers:(uuid,display,id))`;
  const { data, error, isLoading } = useSWR<{ data: ServiceTypesResponse }>(url, openmrsFetch, {});
  return { serviceTypes: data?.data.setMembers ?? [], error, isLoading };
}

export const usePaymentModes = () => {
  const url = `/ws/rest/v1/cashier/paymentMode`;
  const { data, error, isLoading } = useSWR<{ data: ResponseObject }>(url, openmrsFetch, {});
  return { paymentModes: data?.data.results ?? [], error, isLoading };
};

export const createBillableService = (payload: any, uuid?: string) => {
  const url = `/ws/rest/v1/cashier/billableService/${uuid ? `${uuid}` : ''}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
/**
 * Deletes a billable service by its unique identifier (UUID).
 *
 * @param uuid - The unique identifier of the billable service to be deleted.
 * @returns A promise that resolves with the response of the DELETE request.
 *
 * @remarks
 * This function sends a DELETE request to the OpenMRS REST API endpoint
 * for billable services. Ensure that the `uuid` provided corresponds to
 * an existing billable service.
 */
export const deleteBillableService = (uuid: string) => {
  const url = `/ws/rest/v1/cashier/billableService/${uuid}`;
  return openmrsFetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useConceptsSearch(conceptToLookup: string) {
  const conditionsSearchUrl = `/ws/rest/v1/conceptsearch?q=${conceptToLookup}`;

  const { data, error, isLoading } = useSWR<{ data: { results: Array<ServiceConcept> } }, Error>(
    conceptToLookup ? conditionsSearchUrl : null,
    openmrsFetch,
  );

  return {
    searchResults: data?.data?.results ?? [],
    error: error,
    isSearching: isLoading,
  };
}
export function useServiceTableFilters(rows: ChargeAble[]) {
  const [filters, setFilters] = useState<ServiceTableFilters>(DEFAULT_FILTERS);

  const availableTypes = useMemo(
    () => [...new Set(rows.map((r) => r.serviceType?.display).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const typeMatch = filters.types.length === 0 || filters.types.includes(row.serviceType?.display ?? '');
        const availMatch = filters.available === 'all' || row.serviceStatus === filters.available;
        return typeMatch && availMatch;
      }),
    [rows, filters],
  );

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return { filters, setFilters, filteredRows, availableTypes, resetFilters };
}
