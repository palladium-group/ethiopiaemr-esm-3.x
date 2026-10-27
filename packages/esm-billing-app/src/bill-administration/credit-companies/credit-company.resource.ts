import useSWR, { mutate } from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type CreditCompany } from '../../types';

export const creditCompanyUrl = `${restBaseUrl}/cashier/creditCompany`;

/**
 * All credit companies, retired ones included, so admins can see and restore them.
 * MRU only lists active companies (the endpoint's default).
 */
export const useCreditCompanies = () => {
  const url = `${creditCompanyUrl}?v=full&includeAll=true`;
  const { data, error, isLoading } = useSWR<{ data: { results: Array<CreditCompany> } }>(url, openmrsFetch);

  return {
    creditCompanies: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export const saveCreditCompany = (creditCompany: { name: string; description?: string }, uuid?: string) => {
  return openmrsFetch(uuid ? `${creditCompanyUrl}/${uuid}` : creditCompanyUrl, {
    method: 'POST',
    body: creditCompany,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const retireCreditCompany = (uuid: string, reason: string) => {
  return openmrsFetch(`${creditCompanyUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, {
    method: 'DELETE',
  });
};

export const restoreCreditCompany = (uuid: string) => {
  return openmrsFetch(`${creditCompanyUrl}/${uuid}`, {
    method: 'POST',
    body: { retired: false },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const mutateCreditCompanies = () => {
  mutate((key) => typeof key === 'string' && key.startsWith(creditCompanyUrl), undefined, { revalidate: true });
};

/** Readable message from a failed request (REST wraps `message` in brackets; `translatedMessage` is plain). */
export const getErrorMessage = (error): string =>
  error?.responseBody?.error?.translatedMessage ?? error?.responseBody?.error?.message ?? error?.message;
