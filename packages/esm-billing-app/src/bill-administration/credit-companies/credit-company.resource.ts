import useSWR, { mutate } from 'swr';
import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type Organization } from '../../types';

export const organizationUrl = `${restBaseUrl}/organization`;

/** Organization type seeded by the custom module for companies billed under the "Credit Company" payer. */
export const CREDIT_COMPANY_ORGANIZATION_TYPE_UUID = 'e6cd2a97-c3ed-40ca-8fa2-4856ca6cbe60';

export type CreditCompanyPayload = {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  tin: string;
  contractNumber: string;
  /** yyyy-MM-dd, or null to clear */
  contractStartDate: string | null;
  contractEndDate: string | null;
};

/**
 * All credit companies, retired ones included, so admins can see and restore them.
 * MRU only lists active companies (the endpoint's default).
 */
export const useCreditCompanies = () => {
  const url = `${organizationUrl}?type=${CREDIT_COMPANY_ORGANIZATION_TYPE_UUID}&v=full&includeAll=true`;
  const { data, error, isLoading } = useSWR<{ data: { results: Array<Organization> } }>(url, openmrsFetch);

  return {
    creditCompanies: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export const saveCreditCompany = (creditCompany: CreditCompanyPayload, uuid?: string) => {
  return openmrsFetch(uuid ? `${organizationUrl}/${uuid}` : organizationUrl, {
    method: 'POST',
    // The type is set on create and cannot be changed afterwards
    body: uuid ? creditCompany : { ...creditCompany, organizationType: CREDIT_COMPANY_ORGANIZATION_TYPE_UUID },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const retireCreditCompany = (uuid: string, reason: string) => {
  return openmrsFetch(`${organizationUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, {
    method: 'DELETE',
  });
};

export const restoreCreditCompany = (uuid: string) => {
  return openmrsFetch(`${organizationUrl}/${uuid}`, {
    method: 'POST',
    body: { retired: false },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const mutateCreditCompanies = () => {
  mutate((key) => typeof key === 'string' && key.startsWith(organizationUrl), undefined, { revalidate: true });
};

/** Readable message from a failed request (REST wraps `message` in brackets; `translatedMessage` is plain). */
export const getErrorMessage = (error): string =>
  error?.responseBody?.error?.translatedMessage ?? error?.responseBody?.error?.message ?? error?.message;

/**
 * Contract dates are calendar dates. The server returns them as date-times in its own timezone
 * (e.g. 2026-01-01T00:00:00.000+0300), so keep only the date part instead of converting timezones.
 */
export const parseContractDate = (value?: string | null): Date | null =>
  value ? dayjs(value.substring(0, 10)).toDate() : null;

export const formatContractDate = (date?: Date | null): string | null =>
  date ? dayjs(date).format('YYYY-MM-DD') : null;
