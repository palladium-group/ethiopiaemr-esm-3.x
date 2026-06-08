import React from 'react';
import { InlineLoading } from '@carbon/react';
import { type Drug } from '@openmrs/esm-patient-common-lib';
import { useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type BillingConfig } from '../../../config-schema';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { usesExternalStockSource } from '../stock-inventory.resource';
import { useBillableItem, useStockItemInventory } from '../useBillableItem';
import styles from './drug-order.scss';

type DrugOrderProps = {
  drug: Drug;
};

const DrugOrder: React.FC<DrugOrderProps> = ({ drug }) => {
  const { t } = useTranslation();
  const config = useConfig<BillingConfig>();
  const { format: formatCurrency } = useCurrencyFormatting();
  const showStock = config.showStockAvailability;
  const showPrice = !usesExternalStockSource(config);

  const { stockItem, isLoading: isLoadingInventory, stockDisplayState } = useStockItemInventory(drug?.uuid);
  const { billableItem, isLoading: isLoadingPrice } = useBillableItem(
    drug?.concept?.uuid,
    drug?.uuid,
    showPrice && Boolean(drug?.uuid),
  );

  if (!drug?.uuid) {
    return null;
  }

  const isLoading = (showStock && isLoadingInventory) || (showPrice && isLoadingPrice);
  if (isLoading) {
    return (
      <div className={styles.drugOrderContainer}>
        <InlineLoading
          status="active"
          iconDescription={t('loadingStock', 'Checking stock...')}
          description={t('loadingStock', 'Checking stock...')}
        />
      </div>
    );
  }

  if (!showStock && !showPrice) {
    return null;
  }

  return (
    <div className={styles.drugOrderContainer}>
      {showStock && stockDisplayState === 'in_stock' && (
        <>
          <div className={styles.bold}>{t('inStock', 'In Stock')}</div>
          {stockItem.map((item, index) => (
            <div key={index} className={styles.itemContainer}>
              <span>{item.partyName}</span>
              <span>
                {Math.round(item.quantity)} {item.quantityUoM}(s)
              </span>
            </div>
          ))}
        </>
      )}

      {showStock && stockDisplayState === 'out_of_stock' && (
        <div className={styles.red}>{t('drugNotAvailable', 'Drug Is Not Available / Out of Stock')}</div>
      )}

      {showStock && stockDisplayState === 'not_mapped' && (
        <div className={styles.stockWarning}>{t('drugNotInPharmacyCatalog', 'Not in pharmacy catalog')}</div>
      )}

      {showStock && stockDisplayState === 'unavailable' && (
        <div className={styles.stockWarning}>{t('stockUnavailable', 'Stock unavailable')}</div>
      )}

      {showPrice && billableItem && (
        <div>
          {billableItem.servicePrices.map((item) => (
            <div key={item.uuid} className={styles.itemContainer}>
              <span className={styles.bold}>{item.paymentMode.name}</span>
              <span>{formatCurrency(item.price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrugOrder;
