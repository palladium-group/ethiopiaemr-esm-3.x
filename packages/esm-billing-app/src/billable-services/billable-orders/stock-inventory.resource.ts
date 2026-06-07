import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type BillingConfig } from '../../config-schema';

export type StockInventoryItem = {
  quantityUoM: string;
  quantity: number;
  partyName: string;
  stockItemUuid?: string;
};

type StockInventoryResponse = {
  data: {
    results: Array<StockInventoryItem>;
    total: number;
  };
};

type StockInventoryUrlOptions = {
  forDisplay?: boolean;
};

export function buildStockInventoryUrl(
  drugUuid: string | undefined,
  config: Pick<BillingConfig, 'showStockAvailability' | 'stockInventoryUrl'>,
  options: StockInventoryUrlOptions = {},
): string | null {
  if (!drugUuid) {
    return null;
  }

  if (options.forDisplay && !config.showStockAvailability) {
    return null;
  }

  const externalUrl = config.stockInventoryUrl?.trim();
  if (externalUrl) {
    return externalUrl.replace(/\$\{restBaseUrl\}/g, restBaseUrl).replace(/\$\{drugUuid\}/g, drugUuid);
  }

  return `${restBaseUrl}/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&drugUuid=${drugUuid}`;
}

export function usesExternalStockSource(config: Pick<BillingConfig, 'stockInventoryUrl'>): boolean {
  return Boolean(config.stockInventoryUrl?.trim());
}

function useStockInventoryConfig() {
  return useConfig<BillingConfig>();
}

export const useSockItemInventory = (drugUuid: string | undefined) => {
  const config = useStockInventoryConfig();
  const url = buildStockInventoryUrl(drugUuid, config, { forDisplay: true });
  const { data, error, isLoading } = useSWR<StockInventoryResponse>(url, openmrsFetch);

  return {
    stockItem: url ? data?.data?.results ?? [] : [],
    isLoading: url ? isLoading : false,
    error,
  };
};

export const useStockItemQuantity = (drugUuid: string | undefined) => {
  const config = useStockInventoryConfig();
  const url = buildStockInventoryUrl(drugUuid, config);
  const { data, error, isLoading } = useSWR<StockInventoryResponse>(url, openmrsFetch);

  return {
    stockItemQuantity: url ? data?.data?.total ?? 0 : 0,
    stockItemUuid: url ? data?.data?.results?.[0]?.stockItemUuid ?? '' : '',
    isLoading: url ? isLoading : false,
    error,
  };
};
