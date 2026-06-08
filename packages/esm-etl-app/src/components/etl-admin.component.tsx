import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  InlineNotification,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { Renew, Reset } from '@carbon/react/icons';
import { recreateTables, triggerSync, useEtlSyncStatus } from '../api/etl.resource';
import RecreateConfirmModal from './recreate-confirm-modal.component';
import styles from './etl-admin.component.scss';

type ActionState = 'idle' | 'syncing' | 'recreating';

const headers = [
  { key: 'tableName', header: 'Table' },
  { key: 'lastSync', header: 'Last Sync' },
  { key: 'status', header: 'Status' },
  { key: 'durationMs', header: 'Duration (ms)' },
  { key: 'recordsProcessed', header: 'Records' },
];

const EtlAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { syncStatus, isLoading, error, mutate } = useEtlSyncStatus();
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [notification, setNotification] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const busy = actionState !== 'idle';

  const handleSync = useCallback(async () => {
    setActionState('syncing');
    setNotification(null);
    try {
      const result = await triggerSync();
      if (result.status === 'success') {
        setNotification({ kind: 'success', message: t('refreshSuccess', 'ETL tables refreshed successfully.') });
      } else {
        setNotification({ kind: 'error', message: t('refreshError', 'Sync failed: {{message}}', { message: result.message }) });
      }
    } catch (e) {
      setNotification({ kind: 'error', message: t('refreshError', 'Sync failed: {{message}}', { message: (e as Error).message }) });
    } finally {
      setActionState('idle');
      mutate();
    }
  }, [t, mutate]);

  const handleRecreateConfirmed = useCallback(async () => {
    setShowConfirmModal(false);
    setActionState('recreating');
    setNotification(null);
    try {
      const result = await recreateTables();
      if (result.status === 'success') {
        setNotification({ kind: 'success', message: t('recreateSuccess', 'ETL tables recreated and repopulated successfully.') });
      } else {
        setNotification({ kind: 'error', message: t('recreateError', 'Recreate failed: {{message}}', { message: result.message }) });
      }
    } catch (e) {
      setNotification({ kind: 'error', message: t('recreateError', 'Recreate failed: {{message}}', { message: (e as Error).message }) });
    } finally {
      setActionState('idle');
      mutate();
    }
  }, [t, mutate]);

  const rows = syncStatus?.tables
    ? Object.entries(syncStatus.tables).map(([tableName, info]) => ({
        id: tableName,
        tableName,
        lastSync: info.lastSync ?? '—',
        status: info.syncStatus,
        durationMs: info.durationMs != null ? info.durationMs.toLocaleString() : '—',
        recordsProcessed: info.recordsProcessed != null ? info.recordsProcessed.toLocaleString() : '—',
      }))
    : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('etlAdministration', 'ETL Administration')}</h2>
        <p className={styles.description}>
          {t('etlAdminDescription', 'Manually trigger an incremental ETL refresh or a full table rebuild. The ETL populates the flat reporting tables from raw OpenMRS data on a scheduled basis; use these controls to force an immediate update.')}
        </p>
      </div>

      <Layer className={styles.actionsPanel}>
        <div className={styles.actions}>
          <Button
            kind="primary"
            renderIcon={Renew}
            disabled={busy}
            onClick={handleSync}>
            {actionState === 'syncing'
              ? <InlineLoading description={t('refreshing', 'Refreshing…')} />
              : t('refreshTables', 'Refresh Tables')}
          </Button>
          <Button
            kind="danger--tertiary"
            renderIcon={Reset}
            disabled={busy}
            onClick={() => setShowConfirmModal(true)}>
            {actionState === 'recreating'
              ? <InlineLoading description={t('recreating', 'Recreating…')} />
              : t('recreateTables', 'Recreate Tables')}
          </Button>
        </div>

        {notification && (
          <InlineNotification
            className={styles.notification}
            kind={notification.kind}
            lowContrast
            hideCloseButton={false}
            title={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </Layer>

      <div className={styles.statusSection}>
        <h3 className={styles.sectionHeading}>{t('syncStatus', 'Sync Status')}</h3>

        {isLoading && <DataTableSkeleton columnCount={headers.length} rowCount={3} />}

        {error && !isLoading && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('statusError', 'Failed to load sync status.')}
          />
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className={styles.empty}>{t('noStatus', 'No sync records found. Run a sync to see results.')}</p>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <DataTable rows={rows} headers={headers} size="sm">
            {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHeader {...getHeaderProps({ header })} key={header.key}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.info.header === 'status' ? (
                            <Tag type={cell.value === 'success' ? 'green' : 'red'} size="sm">
                              {cell.value}
                            </Tag>
                          ) : (
                            cell.value
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTable>
        )}

        <p className={styles.scheduleNote}>
          {t('syncScheduleNote', 'The ETL also runs automatically on a scheduled interval configured in Administration → Manage Scheduler.')}
        </p>
      </div>

      <RecreateConfirmModal
        open={showConfirmModal}
        onConfirm={handleRecreateConfirmed}
        onClose={() => setShowConfirmModal(false)}
      />
    </div>
  );
};

export default EtlAdmin;
