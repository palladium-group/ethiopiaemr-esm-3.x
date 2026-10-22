import { currencyForLocale, formatCatalogPrice } from './order-catalog-price.utils';

describe('catalog price formatting', () => {
  it('uses the billing locale currency, defaulting to ETB', () => {
    expect(currencyForLocale('en')).toBe('ETB');
    expect(currencyForLocale('fr', { en: 'ETB', fr: 'USD' })).toBe('USD');
    expect(currencyForLocale('om', { en: 'ETB' })).toBe('ETB');
  });

  it('formats a price with the currency code', () => {
    expect(formatCatalogPrice(1000, 'ETB', 'en').replace(/\u00a0/g, ' ')).toBe('ETB 1,000.00');
  });
});
