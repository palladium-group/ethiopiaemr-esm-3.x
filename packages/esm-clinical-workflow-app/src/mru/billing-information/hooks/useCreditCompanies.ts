import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

export const useCreditCompanies = (enabled: boolean) => {
  const creditCompaniesUrl = `/ws/rest/v1/cashier/creditCompany?v=full`;
  const {
    data: creditCompaniesData,
    error,
    isLoading,
  } = useSWR<{ data: { results: any[] } }>(enabled ? creditCompaniesUrl : null, openmrsFetch);

  return {
    creditCompanies: creditCompaniesData?.data?.results || [],
    isLoading,
    error,
  };
};
