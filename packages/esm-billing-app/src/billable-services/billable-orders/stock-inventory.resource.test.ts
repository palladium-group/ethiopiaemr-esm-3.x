import { buildStockInventoryUrl, usesExternalStockSource } from './stock-inventory.resource';

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
