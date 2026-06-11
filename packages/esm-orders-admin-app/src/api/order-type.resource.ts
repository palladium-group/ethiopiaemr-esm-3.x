import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface OrderType {
  uuid: string;
  display: string;
  name: string;
}

const drugOrderTypeRepresentation = 'custom:(uuid,display,name)';

export function useDrugOrderType() {
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OrderType> } }, Error>(
    `${restBaseUrl}/ordertype?v=${drugOrderTypeRepresentation}`,
    openmrsFetch,
  );

  const drugOrderType =
    data?.data?.results?.find(
      (orderType) =>
        orderType.name?.toLowerCase() === 'drug order' || orderType.display?.toLowerCase().includes('drug order'),
    ) ?? data?.data?.results?.[0];

  return {
    drugOrderType,
    error,
    isLoading,
  };
}
