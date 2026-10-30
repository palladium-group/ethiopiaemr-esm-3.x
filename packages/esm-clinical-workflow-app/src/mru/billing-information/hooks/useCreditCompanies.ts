import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface CreditCompany {
  uuid: string;
  id: string; // Company Id
  name: string; // Company Name
}

export const MOCK_CREDIT_COMPANIES: CreditCompany[] = [
  { uuid: 'cc-comp-uuid-1', id: 'ET-001', name: 'Ethiopian Airlines' },
  { uuid: 'cc-comp-uuid-2', id: 'ET-002', name: 'Ethio Telecom' },
  { uuid: 'cc-comp-uuid-3', id: 'ET-003', name: 'Commercial Bank of Ethiopia' },
  { uuid: 'cc-comp-uuid-4', id: 'ET-004', name: 'Ethiopian Electric Power' },
  { uuid: 'cc-comp-uuid-5', id: 'ET-005', name: 'Ministry of Health' },
];

export const useCreditCompanies = (enabled = true) => {
  const creditCompaniesUrl = `${restBaseUrl}/cashier/creditCompany?v=full`;
  const { data, error, isLoading } = useSWR<{ data: { results: any[] } }>(
    enabled ? creditCompaniesUrl : null,
    openmrsFetch,
    {
      shouldRetryOnError: false,
    },
  );

  const apiResults = data?.data?.results;
  const companies: CreditCompany[] =
    apiResults && apiResults.length > 0
      ? apiResults.map((item: any) => ({
          uuid: item.uuid,
          id: item.code || item.id || item.identifier || item.uuid?.substring(0, 8) || '',
          name: item.name || item.display || '',
        }))
      : MOCK_CREDIT_COMPANIES;

  return {
    creditCompanies: companies,
    isLoading: enabled && isLoading && !apiResults,
    error,
  };
};
