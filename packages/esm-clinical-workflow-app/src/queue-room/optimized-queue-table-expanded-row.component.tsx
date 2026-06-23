import React, { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import type { QueueEntry } from '../types';
import CurrentVisit from './expanded-visit/current-visit/current-visit-summary.component';
import PastVisit from './expanded-visit/past-visit/past-visit.component';
import styles from './optimized-queue-table.scss';

/**
 * Matches the upstream queue table expanded row.
 * Visit data is fetched on demand when the row is expanded (child components mount).
 */
const OptimizedQueueTableExpandedRow: FC<{ queueEntry: QueueEntry }> = ({ queueEntry }) => {
  const { t } = useTranslation();
  const patientUuid = queueEntry.patient?.uuid;
  const visitUuid = queueEntry.visit?.uuid;

  if (!patientUuid || !visitUuid) {
    return <p className={styles.expandedRowFallback}>{t('visitDataUnavailable', 'Visit data unavailable')}</p>;
  }

  return (
    <Tabs>
      <TabList aria-label={t('visitTabs', 'Visit tabs')} className={styles.expandedTabList}>
        <Tab className={styles.expandedTab}>{t('currentVisit', 'Current visit')}</Tab>
        <Tab className={styles.expandedTab}>{t('previousVisit', 'Previous visit')}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <CurrentVisit patientUuid={patientUuid} visitUuid={visitUuid} />
        </TabPanel>
        <TabPanel>
          <PastVisit patientUuid={patientUuid} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default OptimizedQueueTableExpandedRow;
