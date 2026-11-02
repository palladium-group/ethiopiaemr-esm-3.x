import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { CREDIT_ORGANIZATION_TYPE_UUID } from '../billing-constants';

export interface CreditCompany {
  uuid: string;
  id: string;
  name: string;
}

export const useCreditCompanies = (enabled = true) => {
  const url = enabled ? `${restBaseUrl}/organization?type=${CREDIT_ORGANIZATION_TYPE_UUID}&v=full` : null;
  const { data, error, isLoading } = useSWR<{ data: { results: any[] } }>(url, openmrsFetch);

  const creditCompanies: CreditCompany[] = (data?.data?.results ?? [])
    .filter((item: any) => !item.retired)
    .map((item: any) => ({
      uuid: item.uuid,
      id: item.contractNumber || item.code || item.tin || item.id || item.identifier || item.uuid,
      name: item.name || item.display || '',
    }));

  return { creditCompanies, isLoading, error };
};
