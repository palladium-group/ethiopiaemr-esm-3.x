import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { OrderSetOperator } from './order-set.helper';

export interface OrderSetSearchResult {
  uuid: string;
  name: string;
  description?: string;
  retired: boolean;
  operator: OrderSetOperator;
  orderSetMembers?: Array<{
    uuid: string;
    display?: string;
    retired: boolean;
  }>;
}

export interface OrderSetMemberDetail {
  uuid: string;
  display?: string;
  retired: boolean;
  orderTemplate?: string;
  concept?: {
    uuid: string;
    display: string;
  };
  orderType?: {
    uuid: string;
    display: string;
  };
}

export interface OrderSetDetail extends OrderSetSearchResult {
  orderSetMembers?: Array<OrderSetMemberDetail>;
}

const orderSetListRepresentation =
  'custom:(uuid,name,description,retired,operator,orderSetMembers:(uuid,display,retired))';

const orderSetFullRepresentation =
  'custom:(uuid,name,description,retired,operator,orderSetMembers:(uuid,display,retired,orderTemplate,orderTemplateType,concept:(uuid,display),orderType:(uuid,display)))';

function parseOrderSetList(data: unknown): Array<OrderSetSearchResult> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<OrderSetSearchResult> }).results;
  }

  return [];
}

function filterOrderSetsByQuery(orderSets: Array<OrderSetSearchResult>, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) {
    return [];
  }

  return orderSets.filter((orderSet) => {
    if (orderSet.retired) {
      return false;
    }

    const name = orderSet.name?.toLowerCase() ?? '';
    const description = orderSet.description?.toLowerCase() ?? '';
    return name.includes(term) || description.includes(term);
  });
}

export function useOrderSetSearch(query: string, enabled = true) {
  const shouldFetch = enabled && query.trim().length >= 2;

  const { data, error, isLoading } = useSWRImmutable<{ data: unknown }, Error>(
    shouldFetch ? 'medications-order-sets-search' : null,
    () => openmrsFetch(`${restBaseUrl}/orderset?v=${orderSetListRepresentation}`),
  );

  const orderSets = useMemo(() => filterOrderSetsByQuery(parseOrderSetList(data?.data), query), [data, query]);

  return useMemo(
    () => ({
      orderSets,
      error,
      isLoading: shouldFetch && isLoading,
    }),
    [orderSets, error, isLoading, shouldFetch],
  );
}

export function useOrderSet(orderSetUuid: string | null) {
  const { data, error, isLoading } = useSWRImmutable<{ data: OrderSetDetail }, Error>(
    orderSetUuid ? `${restBaseUrl}/orderset/${orderSetUuid}?v=${orderSetFullRepresentation}` : null,
    openmrsFetch,
  );

  return useMemo(
    () => ({
      orderSet: data?.data,
      error,
      isLoading: Boolean(orderSetUuid) && isLoading,
    }),
    [data, error, isLoading, orderSetUuid],
  );
}
