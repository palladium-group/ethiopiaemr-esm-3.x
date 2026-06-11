import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR, { mutate as globalMutate } from 'swr';
import { orderSetFullRepresentation, orderSetListRepresentation } from '../constants';
import type { OrderSetListItem, OrderSetSavePayload } from '../types';

export const orderSetsSwrKey = 'order-sets-admin';

const orderSetBaseUrl = `${restBaseUrl}/orderset`;

function parseOrderSetsResponse(data: unknown): Array<OrderSetListItem> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<OrderSetListItem> }).results;
  }

  return [];
}

export function useOrderSets(includeRetired = false) {
  const url = `${orderSetBaseUrl}?v=${orderSetListRepresentation}${includeRetired ? '&includeAll=true' : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: unknown }>(
    [orderSetsSwrKey, includeRetired],
    () => openmrsFetch(url),
  );

  return {
    orderSets: parseOrderSetsResponse(data?.data),
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function getOrderSetUrl(uuid: string) {
  return `${orderSetBaseUrl}/${uuid}?v=${orderSetFullRepresentation}`;
}

export function saveOrderSet(payload: OrderSetSavePayload) {
  const hasUuid = Boolean(payload.uuid);
  const url = hasUuid ? `${orderSetBaseUrl}/${payload.uuid}` : orderSetBaseUrl;
  const { uuid, ...body } = payload;

  return openmrsFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: hasUuid ? payload : body,
  });
}

export function retireOrderSet(uuid: string, reason: string) {
  return openmrsFetch(`${orderSetBaseUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, {
    method: 'DELETE',
  });
}

export function revalidateOrderSets() {
  return globalMutate((key) => Array.isArray(key) && key[0] === orderSetsSwrKey);
}
