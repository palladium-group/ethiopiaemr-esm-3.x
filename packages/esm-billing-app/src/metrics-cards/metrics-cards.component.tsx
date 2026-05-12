import React, { useMemo } from 'react';
import { Button, InlineLoading, Layer, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import classNames from 'classnames';
import dayjs from 'dayjs';

import styles from './metrics-cards.scss';
import { useBillSummary } from './metrics.resource';
import { Renew } from '@carbon/react/icons';
import { useCurrencyFormatting } from '../helpers/currency';
import { formatDate } from '@openmrs/esm-framework';

export default function MetricsCards() {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const { data: billSummary, isLoading, error, mutate } = useBillSummary();
  const sectionDate = formatDate(dayjs().toDate());
  const cards = useMemo(
    () => [
      { title: t('totalBillsLabel', 'Total Bills'), count: formatCurrency(billSummary?.totalBills) },
      { title: t('paidBills', 'Paid Bills'), count: formatCurrency(billSummary?.paidBills) },
      { title: t('pendingBills', 'Pending Bills'), count: formatCurrency(billSummary?.pendingBills) },
      { title: t('exemptedBills', 'Exempted Bills'), count: formatCurrency(billSummary?.exemptedBills) },
    ],
    [t, billSummary],
  );

  if (isLoading) {
    return (
      <section className={styles.container} aria-labelledby="bill-metrics-heading">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionDate}>{sectionDate}</span>
        </header>
        <InlineLoading
          status="active"
          iconDescription="Loading"
          description={t('loadingBillMetrics', 'Loading bill metrics...')}
        />
      </section>
    );
  }

  if (error) {
    return <ErrorState headerTitle={t('billMetrics', 'Bill metrics')} error={error} />;
  }
  return (
    <section className={styles.container} aria-labelledby="bill-metrics-heading">
      <header className={styles.sectionHeader}>
        <span className={styles.sectionDate}>{sectionDate}</span>
        <Button
          kind="ghost"
          onClick={() => mutate()}
          size="sm"
          renderIcon={Renew}
          iconDescription={t('refreshMetrics', 'Refresh Metric')}>
          {t('refreshMetrics', 'Refresh Metric')}
        </Button>
      </header>
      <div className={styles.cardsRow}>
        {cards.map((card) => (
          <Layer key={card.title} className={classNames(styles.cardContainer)}>
            <Tile className={styles.tileContainer}>
              <div className={styles.tileHeader}>
                <div className={styles.headerLabelContainer}>
                  <label className={styles.headerLabel}>{card.title}</label>
                </div>
              </div>
              <div>
                <p className={styles.totalsValue}>{card.count}</p>
              </div>
            </Tile>
          </Layer>
        ))}
      </div>
    </section>
  );
}
