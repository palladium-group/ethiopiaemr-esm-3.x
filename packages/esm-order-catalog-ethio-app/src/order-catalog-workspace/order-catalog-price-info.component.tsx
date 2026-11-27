import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import { type CatalogServicePrice } from '../api/billable-availability.resource';
import { currencyForLocale, formatCatalogPrice } from './order-catalog-price.utils';
import styles from './order-catalog-price-info.scss';

export interface OrderCatalogPriceInfoProps {
  prices: Array<CatalogServicePrice> | undefined;
  isLoading: boolean;
  hasError: boolean;
}

const OrderCatalogPriceInfo: React.FC<OrderCatalogPriceInfoProps> = ({ prices, isLoading, hasError }) => {
  const { t, i18n } = useTranslation();
  const billingConfig = useConfig<{ localeCurrencyMapping?: Record<string, string> }>({
    externalModuleName: '@palladium-ethiopia/esm-billing-app',
  });

  if (isLoading) {
    return (
      <InlineLoading
        status="active"
        iconDescription={t('loading', 'Loading')}
        description={t('loadingPrice', 'Loading price…')}
      />
    );
  }

  const configuredPrices = (prices ?? []).filter((price) => price.paymentModeName || price.price != null);
  if (hasError || configuredPrices.length === 0) {
    return (
      <InlineNotification
        className={styles.priceNotice}
        kind="warning"
        lowContrast
        title={t('noPriceConfigured', 'No price configured for this service')}
      />
    );
  }

  const locale = i18n.language || 'en';
  const currency = currencyForLocale(locale, billingConfig.localeCurrencyMapping);

  return (
    <div className={styles.priceTile}>
      <table className={styles.priceTable}>
        <thead>
          <tr>
            <th scope="col">{t('paymentMethods', 'Payment methods')}</th>
            <th scope="col">{t('prices', 'Prices')}</th>
          </tr>
        </thead>
        <tbody>
          {configuredPrices.map((price) => (
            <tr key={price.uuid}>
              <td>{price.paymentModeName}</td>
              <td>{formatCatalogPrice(price.price, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderCatalogPriceInfo;
