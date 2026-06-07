import React from 'react';
import { type Drug } from '@openmrs/esm-patient-common-lib';
import { useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type BillingConfig } from '../../../config-schema';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { usesExternalStockSource } from '../stock-inventory.resource';
import { useBillableItem, useSockItemInventory } from '../useBillableItem';
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

  const { stockItem, isLoading: isLoadingInventory } = useSockItemInventory(drug?.uuid);
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
    return null;
  }

  if (!showStock && !showPrice) {
    return null;
  }

  return (
    <div className={styles.drugOrderContainer}>
      {showStock &&
        (stockItem.length > 0 ? (
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
        ) : (
          <div className={styles.red}>{t('drugNotAvailable', 'Drug Is Not Available / Out of Stock')}</div>
        ))}

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
