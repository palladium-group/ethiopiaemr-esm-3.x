import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import first from 'lodash-es/first';

export { useStockItemInventory, useStockItemQuantity } from './stock-inventory.resource';

type BillableItemResponse = {
  uuid: string;
  name: string;
  concept: {
    uuid: string;
    display: string;
  };
  servicePrices: Array<{
    uuid: string;
    price: number;
    paymentMode: {
      uuid: string;
      name: string;
    };
  }>;
};

export const useBillableItem = (billableItemId: string | undefined, drugUuid?: string, enabled = true) => {
  const customRepresentation = `v=custom:(uuid,name,concept:(uuid,display),servicePrices:(uuid,price,paymentMode:(uuid,name)))`;
  const url =
    enabled && drugUuid
      ? `${restBaseUrl}/cashier/billableService?${customRepresentation}&drugUuid=${drugUuid}`
      : enabled && billableItemId
      ? `${restBaseUrl}/cashier/billableService?${customRepresentation}`
      : null;
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<BillableItemResponse> } }>(
    url,
    openmrsFetch,
  );
  const billableItem = drugUuid
    ? first(data?.data?.results)
    : data?.data?.results?.find((item) => item?.concept?.uuid === billableItemId);

  return {
    billableItem: enabled ? billableItem : undefined,
    isLoading: enabled ? isLoading : false,
    error,
  };
};
