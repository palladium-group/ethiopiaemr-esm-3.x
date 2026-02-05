import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

const providerCustomRep =
  'custom:(uuid,identifier,retired,person:(uuid,display,gender),attributes:(uuid,display,value,attributeType:(uuid,name)))';

export interface ProviderSearchResult {
  uuid: string;
  identifier?: string;
  retired?: boolean;
  person?: {
    uuid?: string;
    display?: string;
    gender?: string;
  };
  attributes?: Array<{
    uuid?: string;
    display?: string;
    value?: string | { name?: string };
    attributeType?: { uuid: string; name?: string };
  }>;
}

export async function fetchProvidersByName(
  query: string,
  abortController: AbortController,
): Promise<ProviderSearchResult[]> {
  const response = await openmrsFetch<{ results: ProviderSearchResult[] }>(
    `${restBaseUrl}/provider?q=${encodeURIComponent(query)}&includeAll=false&v=${providerCustomRep}`,
    {
      signal: abortController.signal,
    },
  );
  return response?.data?.results ?? [];
}
