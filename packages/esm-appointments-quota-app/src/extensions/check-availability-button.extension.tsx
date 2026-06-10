import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClickableTile } from '@carbon/react';
import { ChartLineData } from '@carbon/react/icons';
import { useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { openQuotaOverlay } from '../overlay/quota-overlay.store';
import styles from '../overlay/quota-overlay.scss';

const CheckAvailabilityButtonExtension: React.FC = () => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();

  const handleClick = useCallback(() => {
    openQuotaOverlay();
  }, []);

  if (!config.enabled) {
    return null;
  }

  return (
    <ClickableTile className={styles.metricsButton} onClick={handleClick}>
      <ChartLineData size={24} />
      <div className={styles.metricsButtonLabel}>{t('checkAvailability', 'Check availability')}</div>
      <div className={styles.metricsButtonHint}>
        {t('checkAvailabilityHint', 'Review service day and daily capacity before booking.')}
      </div>
    </ClickableTile>
  );
};

export default CheckAvailabilityButtonExtension;
