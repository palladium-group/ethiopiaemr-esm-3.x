import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DataTableSkeleton, Dropdown, Layer, TableToolbarSearch } from '@carbon/react';
import { isDesktop, showModal, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import { useOptimizedQueueEntries } from './optimized-queue-entries.resource';
import OptimizedQueueTable, { filterOptimizedQueueEntriesBySearch } from './optimized-queue-table.component';
import { useFilteredQueueTableColumnIds } from './filtered-queue-table-cells';
import { useServiceQueuesConfig } from './queue-room.resource';
import { useQueueStatuses } from './queue-entries.resource';
import AddPatientToQueueButton from './add-patient-to-queue-button.component';
import { updateSelectedQueueStatus, useServiceQueuesFilterState } from './service-queues-store.util';
import styles from './optimized-queue-table-dashboard.scss';
import tableStyles from './optimized-queue-table.scss';

function ClearQueueEntriesButton({ queueEntries }: { queueEntries: QueueEntry[] }) {
  const { t } = useTranslation();
  const layout = useLayoutType();

  const launchClearAllQueueEntriesModal = useCallback(() => {
    const dispose = showModal('clear-all-queue-entries-modal', {
      closeModal: () => dispose(),
      queueEntries,
    });
  }, [queueEntries]);

  return (
    <Button
      className={tableStyles.clearQueueButton}
      size={isDesktop(layout) ? 'sm' : 'lg'}
      kind="ghost"
      onClick={launchClearAllQueueEntriesModal}
      iconDescription={t('clearQueue', 'Clear queue')}>
      {t('clearQueue', 'Clear queue')}
    </Button>
  );
}

function StatusDropdownFilter() {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { statuses } = useQueueStatuses();
  const { selectedQueueStatusDisplay } = useServiceQueuesFilterState();

  const handleStatusChange = ({ selectedItem }: { selectedItem: { uuid?: string; display: string } }) => {
    updateSelectedQueueStatus(selectedItem.uuid, selectedItem.display);
  };

  return (
    <div className={tableStyles.filterContainer}>
      <Dropdown
        id="optimized-queue-status"
        items={[{ display: t('any', 'Any') }, ...(statuses ?? [])]}
        itemToString={(item) => (item ? item.display : '')}
        label={selectedQueueStatusDisplay ?? t('all', 'All')}
        onChange={handleStatusChange}
        size={isDesktop(layout) ? 'sm' : 'lg'}
        titleText={t('showPatientsWithStatus', 'Show patients with status:')}
        type="inline"
      />
    </div>
  );
}

function OptimizedQueueTableSection() {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const columnIds = useFilteredQueueTableColumnIds();
  const { visitQueueNumberAttributeUuid } = useServiceQueuesConfig();
  const { selectedServiceUuid, selectedQueueLocationUuid, selectedQueueStatusUuid } = useServiceQueuesFilterState();
  const [searchTerm, setSearchTerm] = useState('');

  const searchCriteria = useMemo(() => {
    return {
      service: selectedServiceUuid,
      location: selectedQueueLocationUuid,
      isEnded: false,
      status: selectedQueueStatusUuid,
    };
  }, [selectedServiceUuid, selectedQueueLocationUuid, selectedQueueStatusUuid]);

  const { queueEntries, isLoading, isValidating, error } = useOptimizedQueueEntries(searchCriteria);

  useEffect(() => {
    if (error?.message) {
      showSnackbar({
        title: t('errorLoadingQueueEntries', 'Error loading queue entries'),
        kind: 'error',
        subtitle: error.message,
      });
    }
  }, [error?.message, t]);

  const filteredQueueEntries = useMemo(() => {
    return filterOptimizedQueueEntriesBySearch(
      queueEntries ?? [],
      searchTerm,
      columnIds,
      visitQueueNumberAttributeUuid,
    );
  }, [columnIds, queueEntries, searchTerm, visitQueueNumberAttributeUuid]);

  const paginationResetKey = useMemo(
    () => JSON.stringify({ searchCriteria, searchTerm }),
    [searchCriteria, searchTerm],
  );

  if (isLoading || columnIds.length === 0) {
    return <DataTableSkeleton className={styles.tableSection} role="progressbar" />;
  }

  return (
    <OptimizedQueueTable
      isLoading={isLoading}
      isValidating={isValidating}
      paginationResetKey={paginationResetKey}
      queueEntries={filteredQueueEntries}
      tableFilters={
        <>
          <ClearQueueEntriesButton queueEntries={filteredQueueEntries} />
          <StatusDropdownFilter />
          <TableToolbarSearch
            className={tableStyles.search}
            onChange={(event) => setSearchTerm(typeof event === 'string' ? event : event.target.value)}
            placeholder={t('searchThisList', 'Search this list')}
            size={isDesktop(layout) ? 'sm' : 'lg'}
            persistent
          />
        </>
      }
    />
  );
}

/**
 * Drop-in replacement for the default service queue table with optimized data fetching.
 * Uses the same filters, columns, actions, and expanded rows as the upstream table.
 */
const OptimizedQueueTableDashboard: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();

  return (
    <div className={styles.optimizedQueueTableDashboard}>
      <Layer className={styles.tableSection}>
        <div className={styles.headerContainer}>
          <div className={!isDesktop(layout) ? styles.tabletHeading : styles.desktopHeading}>
            <h4>{t('patientsCurrentlyInQueue', 'Patients currently in queue')}</h4>
          </div>
          <div className={styles.headerButtons}>
            <AddPatientToQueueButton />
          </div>
        </div>
        <OptimizedQueueTableSection />
      </Layer>
    </div>
  );
};

export default OptimizedQueueTableDashboard;
