import {
  buildStockInventoryUrl,
  getStockInventoryErrorCode,
  resolveStockDisplayState,
  STOCK_INVENTORY_ERROR_CODE,
  usesExternalStockSource,
} from './stock-inventory.resource';

jest.mock('@openmrs/esm-framework', () => ({
  restBaseUrl: '/ws/rest/v1',
  openmrsFetch: jest.fn(),
  useConfig: jest.fn(),
}));

describe('buildStockInventoryUrl', () => {
  const baseConfig = {
    showStockAvailability: true,
    stockInventoryUrl: '',
  };

  it('returns null when drugUuid is missing', () => {
    expect(buildStockInventoryUrl(undefined, baseConfig)).toBeNull();
  });

  it('returns null for display when stock availability is disabled', () => {
    expect(
      buildStockInventoryUrl('drug-uuid', { ...baseConfig, showStockAvailability: false }, { forDisplay: true }),
    ).toBeNull();
  });

  it('returns internal stock URL when no external URL is configured', () => {
    expect(buildStockInventoryUrl('drug-uuid', baseConfig)).toBe(
      '/ws/rest/v1/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&drugUuid=drug-uuid',
    );
  });

  it('returns internal stock URL for dispensing even when display is disabled', () => {
    expect(buildStockInventoryUrl('drug-uuid', { ...baseConfig, showStockAvailability: false })).toBe(
      '/ws/rest/v1/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&drugUuid=drug-uuid',
    );
  });

  it('interpolates external stock URL placeholders', () => {
    expect(
      buildStockInventoryUrl('drug-uuid', {
        ...baseConfig,
        stockInventoryUrl: '${restBaseUrl}/ethiopiaemrcustommodule/stock/inventory?drugUuid=${drugUuid}',
      }),
    ).toBe('/ws/rest/v1/ethiopiaemrcustommodule/stock/inventory?drugUuid=drug-uuid');
  });
});

describe('usesExternalStockSource', () => {
  it('returns true when stockInventoryUrl is configured', () => {
    expect(usesExternalStockSource({ stockInventoryUrl: '/custom/stock' })).toBe(true);
  });

  it('returns false when stockInventoryUrl is empty', () => {
    expect(usesExternalStockSource({ stockInventoryUrl: '' })).toBe(false);
  });
});

describe('getStockInventoryErrorCode', () => {
  it('returns errorCode from openmrsFetch response body', () => {
    expect(
      getStockInventoryErrorCode({
        responseBody: { errorCode: STOCK_INVENTORY_ERROR_CODE.DRUG_NOT_MAPPED },
      }),
    ).toBe(STOCK_INVENTORY_ERROR_CODE.DRUG_NOT_MAPPED);
  });

  it('returns undefined when error is missing', () => {
    expect(getStockInventoryErrorCode(undefined)).toBeUndefined();
  });
});

describe('resolveStockDisplayState', () => {
  const stockItem = [{ partyName: 'Pharmacy', quantity: 10, quantityUoM: 'Tablet' }];

  it('returns hidden when stock is not fetched', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: false,
        stockItem: [],
        error: undefined,
        usesExternal: false,
      }),
    ).toBe('hidden');
  });

  it('returns loading while fetching', () => {
    expect(
      resolveStockDisplayState({
        isLoading: true,
        hasUrl: true,
        stockItem: [],
        error: undefined,
        usesExternal: true,
      }),
    ).toBe('loading');
  });

  it('returns in_stock when items are present', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: true,
        stockItem,
        error: undefined,
        usesExternal: true,
      }),
    ).toBe('in_stock');
  });

  it('returns out_of_stock when external fetch succeeds with no items', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: true,
        stockItem: [],
        error: undefined,
        usesExternal: true,
      }),
    ).toBe('out_of_stock');
  });

  it('returns not_mapped for DRUG_NOT_MAPPED errors on external stock', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: true,
        stockItem: [],
        error: { responseBody: { errorCode: STOCK_INVENTORY_ERROR_CODE.DRUG_NOT_MAPPED } },
        usesExternal: true,
      }),
    ).toBe('not_mapped');
  });

  it('returns unavailable for upstream errors on external stock', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: true,
        stockItem: [],
        error: { responseBody: { errorCode: STOCK_INVENTORY_ERROR_CODE.STOCK_UPSTREAM_ERROR } },
        usesExternal: true,
      }),
    ).toBe('unavailable');
  });

  it('returns unavailable for other external fetch errors', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: true,
        stockItem: [],
        error: { responseBody: { errorCode: 'STOCK_ENDPOINT_NOT_CONFIGURED' } },
        usesExternal: true,
      }),
    ).toBe('unavailable');
  });

  it('returns out_of_stock for internal stock when fetch fails with empty items', () => {
    expect(
      resolveStockDisplayState({
        isLoading: false,
        hasUrl: true,
        stockItem: [],
        error: new Error('network'),
        usesExternal: false,
      }),
    ).toBe('out_of_stock');
  });
});
