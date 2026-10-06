import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR, { mutate as globalMutate } from 'swr';
import { radiologyReportTemplatesSwrKey, radiologyReportTemplatesUrl } from '../constants';
import type { RadiologyReportTemplate, RadiologyReportTemplatePayload } from '../types';

interface RestListResponse {
  results?: RadiologyReportTemplate[];
}

function parseTemplates(data: unknown): RadiologyReportTemplate[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray((data as RestListResponse).results)) {
    return (data as RestListResponse).results ?? [];
  }

  return [];
}

export function useRadiologyReportTemplates(includeVoided = false) {
  const url = `${radiologyReportTemplatesUrl}?v=full${includeVoided ? '&includeAll=true' : ''}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: unknown }>(
    [radiologyReportTemplatesSwrKey, includeVoided],
    () => openmrsFetch(url),
  );

  return {
    templates: parseTemplates(data?.data),
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function getRadiologyReportTemplateUrl(uuid: string) {
  return `${radiologyReportTemplatesUrl}/${uuid}?v=full`;
}

export function getRadiologyReportTemplate(uuid: string) {
  return openmrsFetch<RadiologyReportTemplate>(getRadiologyReportTemplateUrl(uuid));
}

export function saveRadiologyReportTemplate(payload: RadiologyReportTemplatePayload, uuid?: string) {
  const url = uuid ? `${radiologyReportTemplatesUrl}/${uuid}` : radiologyReportTemplatesUrl;
  return openmrsFetch<RadiologyReportTemplate>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

export function voidRadiologyReportTemplate(uuid: string, reason: string) {
  return openmrsFetch(`${radiologyReportTemplatesUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, {
    method: 'DELETE',
  });
}

export function unvoidRadiologyReportTemplate(uuid: string) {
  return openmrsFetch(`${radiologyReportTemplatesUrl}/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { voided: false },
  });
}

export function revalidateRadiologyReportTemplates() {
  return globalMutate((key) => Array.isArray(key) && key[0] === radiologyReportTemplatesSwrKey);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'responseBody' in error) {
    const body = (error as { responseBody?: { error?: { message?: string }; message?: string } }).responseBody;
    return body?.error?.message ?? body?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
