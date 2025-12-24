import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useTranslation } from 'react-i18next';
import isEmpty from 'lodash-es/isEmpty';

import styles from './metrics-card.component.scss';

dayjs.extend(isSameOrBefore);

interface MetricsCardProps {
  label: string;
  value: number | string;
  headerLabel: string;
  selectedDate?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ label, value, headerLabel, selectedDate }) => {
  const { t } = useTranslation();
  const date = selectedDate || dayjs().format('YYYY-MM-DD');
  const isSelectedDateInPast = useMemo(() => dayjs(date).isBefore(dayjs(), 'date'), [date]);

  return (
    <article className={styles.tileContainer}>
      <div className={styles.tileHeader}>
        <div className={styles.headerLabelContainer}>
          <span className={styles.headerLabel}>{headerLabel}</span>
        </div>
      </div>
      <div className={styles.metricsGrid}>
        <div className={styles.metricsContent}>
          <span className={styles.totalsLabel}>{label}</span>
          <p className={styles.totalsValue}>{value}</p>
        </div>
      </div>
    </article>
  );
};

export default MetricsCard;
