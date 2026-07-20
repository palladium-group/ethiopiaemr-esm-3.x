import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DataTableSkeleton, InlineLoading, Search, Tile, Toggle } from '@carbon/react';
import { Renew } from '@carbon/react/icons';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import ElectiveSurgeryScheduleSection from '../schedule/elective-surgery-schedule-section.component';
import { SURGERY_CATEGORIES } from '../constants';
import { useElectiveSurgerySchedule } from '../hooks/useElectiveSurgerySchedule';
import { useElectiveSurgeryPrivileges } from '../hooks/useElectiveSurgeryPrivileges';
import { useNearDeadlineNotification } from '../hooks/useNearDeadlineNotification';
import styles from './elective-surgery-schedule-dashboard.scss';

export default function ElectiveSurgeryScheduleDashboard() {
  const { t } = useTranslation();
  const headerTitle = t('electiveSurgerySchedule', 'Elective Surgery Schedule');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRemoved, setShowRemoved] = useState(false);
  const { canViewSchedule } = useElectiveSurgeryPrivileges();
  const { schedules, schedulesByCategory, error, isLoading, isValidating, mutateSchedule } = useElectiveSurgerySchedule(
    showRemoved,
    searchTerm,
  );

  useNearDeadlineNotification();

  const handleRefresh = useCallback(() => {
    mutateSchedule();
  }, [mutateSchedule]);

  if (!canViewSchedule) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <ErrorState
          error={
            new Error(
              t('schedulePrivilegeRequired', 'You do not have permission to view the elective surgery schedule.'),
            )
          }
          headerTitle={headerTitle}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <DataTableSkeleton role="progressbar" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <ErrorState error={error} headerTitle={headerTitle} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <p className={styles.subtitle}>
          {t('electiveSurgeryScheduleDescription', 'Manage elective surgery patients awaiting liaison coordination.')}
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarSearch}>
          <Search
            id="elective-surgery-schedule-search"
            labelText={t('searchPatients', 'Search patients')}
            placeholder={t('searchByNameOrMrn', 'Search by patient name or MRN')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            size="md"
          />
        </div>
        <div className={styles.toolbarActions}>
          <Toggle
            id="show-removed-toggle"
            labelText={t('showRemoved', 'Show removed')}
            labelA={t('no', 'No')}
            labelB={t('yes', 'Yes')}
            toggled={showRemoved}
            onToggle={setShowRemoved}
            size="sm"
          />
          <Button kind="ghost" renderIcon={Renew} onClick={handleRefresh} disabled={isValidating}>
            {t('refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {isValidating ? <InlineLoading description={t('loading', 'Loading...')} /> : null}

      {!schedules.length ? (
        <Tile className={styles.emptyState}>
          <p>{t('noSchedulePatients', 'No elective surgery patients found for the current filters.')}</p>
        </Tile>
      ) : (
        SURGERY_CATEGORIES.map((category) => (
          <ElectiveSurgeryScheduleSection
            key={category}
            category={category}
            schedules={schedulesByCategory[category]}
            onActionComplete={handleRefresh}
          />
        ))
      )}
    </div>
  );
}
