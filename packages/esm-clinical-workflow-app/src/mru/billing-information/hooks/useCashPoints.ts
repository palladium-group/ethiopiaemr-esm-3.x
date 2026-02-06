import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface CashPoint {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  location: {
    uuid: string;
    display: string;
    links: Array<{
      rel: string;
      uri: string;
      resourceAlias: string;
    }>;
  };
}

export const useCashPoints = () => {
  const url = `${restBaseUrl}/cashier/cashPoint`;
  const { data, error, isLoading } = useSWR<{ data: { results: Array<CashPoint> } }>(url, openmrsFetch);

  return {
    cashPoints: data?.data?.results?.filter((cp) => !cp.retired) ?? [],
    isLoading,
    error,
  };
};
