const defaultCurrencyByLocale: Record<string, string> = {
  en: 'ETB',
  sw: 'ETB',
  am: 'ETB',
  'en-GB': 'ETB',
  'am-ET': 'ETB',
};

export function currencyForLocale(
  locale: string,
  localeCurrencyMapping: Record<string, string> = defaultCurrencyByLocale,
): string {
  return localeCurrencyMapping[locale] ?? localeCurrencyMapping.en ?? 'ETB';
}

/** Matches the billing display, e.g. "ETB 1,000.00". */
export function formatCatalogPrice(amount: number, currency = 'ETB', locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
