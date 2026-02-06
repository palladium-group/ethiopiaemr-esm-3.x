import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface BillableService {
  uuid: string;
  name: string;
  shortName: string;
  serviceStatus: string;
  serviceType: {
    display: string;
  };
  servicePrices: Array<{
    uuid: string;
    name: string;
    price: number;
    paymentMode: {
      uuid: string;
      name: string;
      description: string;
      retired: boolean;
      retireReason: null;
      attributeTypes: Array<any>;
      sortOrder: null;
      resourceVersion: string;
    };
  }>;
}

export const useBillableServices = () => {
  const customPresentation = `custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  const url = `${restBaseUrl}/cashier/billableService?v=${customPresentation}`;

  const { data, error, isLoading } = useSWR<{ data: { results: Array<BillableService> } }>(url, openmrsFetch);

  return {
    billableServices: data?.data?.results ?? [],
    isLoading,
    error,
  };
};
