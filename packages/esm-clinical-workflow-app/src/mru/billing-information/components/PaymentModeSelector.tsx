import React, { useMemo } from 'react';
import { Tag } from '@carbon/react';
import type { TFunction } from 'i18next';
import { isCreditPaymentMode } from '../billing-constants';
import styles from '../billing-information.scss';

export interface PaymentModeItem {
  uuid: string;
  name?: string;
  description?: string;
}

export interface PaymentModeSelectorProps {
  billingTypes: PaymentModeItem[];
  selectedBillingTypeUuid?: string;
  onSelectBillingType: (uuid: string) => void;
  t: TFunction;
}

export const PaymentModeSelector: React.FC<PaymentModeSelectorProps> = ({
  billingTypes,
  selectedBillingTypeUuid,
  onSelectBillingType,
  t,
}) => {
  const { directPaymentModes, creditPaymentModes } = useMemo(() => {
    const direct: PaymentModeItem[] = [];
    const credit: PaymentModeItem[] = [];

    (billingTypes || []).forEach((mode) => {
      if (isCreditPaymentMode(mode.uuid, mode.name)) {
        credit.push(mode);
      } else {
        direct.push(mode);
      }
    });

    return { directPaymentModes: direct, creditPaymentModes: credit };
  }, [billingTypes]);

  const selectedCreditMode = creditPaymentModes.find((mode) => mode.uuid === selectedBillingTypeUuid);

  return (
    <div
      className={styles.paymentModeSelectorContainer}
      role="radiogroup"
      aria-label={t('paymentMethods', 'Payment Methods')}>
      <div className={styles.sectionHeaderRow}>
        <p className={styles.sectionTitle}>{t('paymentMethods', 'Payment Methods')}</p>
      </div>

      {/* Direct / Standard Payment Methods */}
      {directPaymentModes.length > 0 && (
        <div className={styles.directPaymentModesGrid}>
          {directPaymentModes.map((mode) => {
            const isSelected = selectedBillingTypeUuid === mode.uuid;
            return (
              <button
                type="button"
                key={mode.uuid}
                role="radio"
                aria-checked={isSelected}
                className={`${styles.paymentModeCard} ${isSelected ? styles.paymentModeCardSelected : ''}`}
                onClick={() => onSelectBillingType(mode.uuid)}>
                <span className={styles.radioIndicator} aria-hidden="true">
                  {isSelected && <span className={styles.radioInnerDot} />}
                </span>
                <span className={styles.paymentModeName}>{mode.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Credit Section */}
      {creditPaymentModes.length > 0 && (
        <div className={`${styles.creditSection} ${selectedCreditMode ? styles.creditSectionActive : ''}`}>
          <div className={styles.creditSectionHeader}>
            <div className={styles.creditTitleArea}>
              <span className={styles.creditTitle}>{t('credit', 'Credit')}</span>
              <span className={styles.creditSubtitle}>{t('creditDescription', 'Coverage & third-party payers')}</span>
            </div>
            {selectedCreditMode && (
              <Tag size="sm" type="blue" className={styles.creditActiveTag}>
                {selectedCreditMode.name || t('selected', 'Selected')}
              </Tag>
            )}
          </div>

          <div className={styles.creditPaymentModesGrid}>
            {creditPaymentModes.map((mode) => {
              const isSelected = selectedBillingTypeUuid === mode.uuid;
              return (
                <button
                  type="button"
                  key={mode.uuid}
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles.paymentModeCard} ${isSelected ? styles.paymentModeCardSelected : ''}`}
                  onClick={() => onSelectBillingType(mode.uuid)}>
                  <span className={styles.radioIndicator} aria-hidden="true">
                    {isSelected && <span className={styles.radioInnerDot} />}
                  </span>
                  <span className={styles.paymentModeName}>{mode.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
