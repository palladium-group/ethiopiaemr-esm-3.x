import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR, { mutate as globalMutate } from 'swr';
import { orderTemplateFullRepresentation, orderTemplateListRepresentation } from '../constants';
import type { OrderTemplateListItem, OrderTemplateSavePayload } from '../types';

export const orderTemplatesSwrKey = 'order-templates-admin';

const orderTemplateBaseUrl = `${restBaseUrl}/ordertemplates/orderTemplate`;

function parseOrderTemplatesResponse(data: unknown): Array<OrderTemplateListItem> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<OrderTemplateListItem> }).results;
  }

  return [];
}

export function useOrderTemplates(includeRetired = false) {
  const url = `${orderTemplateBaseUrl}?v=${orderTemplateListRepresentation}${includeRetired ? '&includeAll=true' : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: unknown }>(
    [orderTemplatesSwrKey, includeRetired],
    () => openmrsFetch(url),
  );

  return {
    orderTemplates: parseOrderTemplatesResponse(data?.data),
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function getOrderTemplateUrl(uuid: string) {
  return `${orderTemplateBaseUrl}/${uuid}?v=${orderTemplateFullRepresentation}`;
}

export function saveOrderTemplate(payload: OrderTemplateSavePayload) {
  const hasUuid = Boolean(payload.uuid);
  const url = hasUuid ? `${orderTemplateBaseUrl}/${payload.uuid}` : orderTemplateBaseUrl;
  const { uuid, ...body } = payload;

  return openmrsFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: hasUuid ? payload : body,
  });
}

export function retireOrderTemplate(uuid: string, reason: string) {
  return openmrsFetch(`${orderTemplateBaseUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, {
    method: 'DELETE',
  });
}

export function revalidateOrderTemplates() {
  return globalMutate((key) => Array.isArray(key) && key[0] === orderTemplatesSwrKey);
}
