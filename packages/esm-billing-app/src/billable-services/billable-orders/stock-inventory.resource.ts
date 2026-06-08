import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type BillingConfig } from '../../config-schema';

export type StockInventoryItem = {
  quantityUoM: string;
  quantity: number;
  partyName: string;
  stockItemUuid?: string;
};

export type StockDisplayState = 'loading' | 'in_stock' | 'out_of_stock' | 'not_mapped' | 'unavailable';

export const STOCK_INVENTORY_ERROR_CODE = {
  DRUG_NOT_MAPPED: 'DRUG_NOT_MAPPED',
  STOCK_UPSTREAM_ERROR: 'STOCK_UPSTREAM_ERROR',
} as const;

type StockInventoryResponse = {
  data: {
    results: Array<StockInventoryItem>;
    total: number;
  };
};

type StockInventoryUrlOptions = {
  forDisplay?: boolean;
};

type StockInventoryErrorBody = {
  errorCode?: string;
};

export function getStockInventoryErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const responseBody = (error as { responseBody?: StockInventoryErrorBody }).responseBody;
  return responseBody?.errorCode;
}

export function resolveStockDisplayState(options: {
  isLoading: boolean;
  hasUrl: boolean;
  stockItem: Array<StockInventoryItem>;
  error: unknown;
  usesExternal: boolean;
}): StockDisplayState {
  const { isLoading, hasUrl, stockItem, error, usesExternal } = options;

  if (!hasUrl) {
    return 'out_of_stock';
  }

  if (isLoading) {
    return 'loading';
  }

  if (usesExternal && error) {
    if (getStockInventoryErrorCode(error) === STOCK_INVENTORY_ERROR_CODE.DRUG_NOT_MAPPED) {
      return 'not_mapped';
    }
    return 'unavailable';
  }

  if (stockItem.length > 0) {
    return 'in_stock';
  }

  return 'out_of_stock';
}

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
  const usesExternal = usesExternalStockSource(config);
  const { data, error, isLoading } = useSWR<StockInventoryResponse>(url, openmrsFetch);
  const stockItem = url && !error ? data?.data?.results ?? [] : [];

  const stockDisplayState = resolveStockDisplayState({
    isLoading: Boolean(url && isLoading),
    hasUrl: Boolean(url),
    stockItem,
    error,
    usesExternal,
  });

  return {
    stockItem,
    isLoading: url ? isLoading : false,
    stockDisplayState,
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
