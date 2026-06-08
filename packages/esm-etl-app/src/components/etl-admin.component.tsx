import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import {
  Button,
  DataTableSkeleton,
  DefinitionTooltip,
  InlineLoading,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react';
import {
  CheckmarkFilled,
  WarningAltFilled,
  Time,
  DataTable as DataTableIcon,
  Renew,
  Reset,
} from '@carbon/react/icons';
import { recreateTables, triggerSync, useEtlSyncStatus, type EtlTableStatus } from '../api/etl.resource';
import RecreateConfirmModal from './recreate-confirm-modal.component';
import styles from './etl-admin.component.scss';

dayjs.extend(relativeTime);
dayjs.extend(utc);

/**
 * The backend returns last_sync as a naive MySQL DATETIME string in UTC
 * (the server runs in UTC; NOW() == UTC_TIMESTAMP()). Parse it explicitly as
 * UTC and convert to the viewer's local zone so relative times and tooltips
 * reflect local time rather than treating the string as already-local.
 */
function parseSyncTime(value: string | null | undefined): dayjs.Dayjs | null {
  if (!value) {
    return null;
  }
  const parsed = dayjs.utc(value);
  return parsed.isValid() ? parsed.local() : null;
}

type ActionState = 'idle' | 'syncing' | 'recreating';

interface TableRowData {
  id: string;
  tableName: string;
  info: EtlTableStatus;
}

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

  const tableRows: Array<TableRowData> = useMemo(
    () =>
      syncStatus?.tables
        ? Object.entries(syncStatus.tables).map(([tableName, info]) => ({ id: tableName, tableName, info }))
        : [],
    [syncStatus],
  );

  // Derived overview metrics for the hero strip.
  const overview = useMemo(() => {
    const total = tableRows.length;
    const failed = tableRows.filter((r) => r.info.syncStatus !== 'success').length;
    const latest = tableRows.reduce<dayjs.Dayjs | null>((acc, r) => {
      const t = parseSyncTime(r.info.lastSync);
      if (!t) {
        return acc;
      }
      return !acc || t.isAfter(acc) ? t : acc;
    }, null);
    return { total, failed, healthy: total > 0 && failed === 0, latest };
  }, [tableRows]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('etlAdministration', 'ETL Administration')}</h2>
        <p className={styles.description}>
          {t('etlAdminDescription', 'Manually trigger an incremental ETL refresh or a full table rebuild. The ETL populates the flat reporting tables from raw OpenMRS data on a scheduled basis; use these controls to force an immediate update.')}
        </p>
      </header>

      {/* ── Status hero strip ─────────────────────────────────────── */}
      {!isLoading && !error && (
        <section className={styles.heroStrip} aria-label={t('overview', 'Overview')}>
          <Tile className={styles.metricTile}>
            <div className={styles.metricIcon}>
              {overview.healthy ? (
                <CheckmarkFilled size={24} className={styles.iconHealthy} />
              ) : (
                <WarningAltFilled size={24} className={styles.iconWarning} />
              )}
            </div>
            <div className={styles.metricBody}>
              <span className={styles.metricLabel}>{t('overallHealth', 'Overall health')}</span>
              <span className={styles.metricValue}>
                {overview.total === 0
                  ? t('noData', 'No data')
                  : overview.healthy
                    ? t('healthy', 'Healthy')
                    : t('nFailed', '{{count}} failed', { count: overview.failed })}
              </span>
            </div>
          </Tile>

          <Tile className={styles.metricTile}>
            <div className={styles.metricIcon}>
              <Time size={24} className={styles.iconNeutral} />
            </div>
            <div className={styles.metricBody}>
              <span className={styles.metricLabel}>{t('lastSync', 'Last sync')}</span>
              <span className={styles.metricValue}>
                {overview.latest ? overview.latest.fromNow() : t('never', 'Never')}
              </span>
            </div>
          </Tile>

          <Tile className={styles.metricTile}>
            <div className={styles.metricIcon}>
              <DataTableIcon size={24} className={styles.iconNeutral} />
            </div>
            <div className={styles.metricBody}>
              <span className={styles.metricLabel}>{t('tablesTracked', 'Tables tracked')}</span>
              <span className={styles.metricValue}>{overview.total}</span>
            </div>
          </Tile>
        </section>
      )}

      {/* ── Action cards ──────────────────────────────────────────── */}
      <section className={styles.actionGrid} aria-label={t('actions', 'Actions')}>
        <Tile className={styles.actionCard}>
          <div className={styles.actionCardHeader}>
            <Renew size={20} className={styles.iconNeutral} />
            <h3 className={styles.actionCardTitle}>{t('refreshTables', 'Refresh Tables')}</h3>
            <Tag type="blue" size="sm">{t('incremental', 'Incremental')}</Tag>
          </div>
          <p className={styles.actionCardBody}>
            {t('refreshHelp', 'Quickly picks up new and changed records since the last sync. Safe to run any time.')}
          </p>
          <Button kind="primary" size="md" renderIcon={Renew} disabled={busy} onClick={handleSync}>
            {actionState === 'syncing'
              ? <InlineLoading description={t('refreshing', 'Refreshing…')} />
              : t('runRefresh', 'Run Refresh')}
          </Button>
        </Tile>

        <Tile className={`${styles.actionCard} ${styles.actionCardDanger}`}>
          <div className={styles.actionCardHeader}>
            <Reset size={20} className={styles.iconWarning} />
            <h3 className={styles.actionCardTitle}>{t('recreateTables', 'Recreate Tables')}</h3>
            <Tag type="red" size="sm">{t('destructive', 'Destructive')}</Tag>
          </div>
          <p className={styles.actionCardBody}>
            {t('recreateHelp', 'Drops and rebuilds every flat table, then fully repopulates from scratch. Reports are incomplete until it finishes.')}
          </p>
          <Button kind="danger--tertiary" size="md" renderIcon={Reset} disabled={busy} onClick={() => setShowConfirmModal(true)}>
            {actionState === 'recreating'
              ? <InlineLoading description={t('recreating', 'Recreating…')} />
              : t('recreate', 'Recreate')}
          </Button>
        </Tile>
      </section>

      {notification && (
        <InlineNotification
          className={styles.notification}
          kind={notification.kind}
          lowContrast
          title={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* ── Table status ──────────────────────────────────────────── */}
      <section className={styles.statusSection} aria-label={t('syncStatus', 'Sync Status')}>
        {isLoading && <DataTableSkeleton columnCount={5} rowCount={4} showHeader={false} showToolbar={false} />}

        {error && !isLoading && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('statusError', 'Failed to load sync status.')}
          />
        )}

        {!isLoading && !error && tableRows.length === 0 && (
          <Tile className={styles.emptyTile}>
            <DataTableIcon size={32} className={styles.iconNeutral} />
            <p className={styles.empty}>{t('noStatus', 'No sync records found. Run a sync to see results.')}</p>
          </Tile>
        )}

        {!isLoading && !error && tableRows.length > 0 && (
          <TableContainer
            title={t('tableStatus', 'Table status')}
            description={t('tableStatusDesc', 'Per-table results from the most recent ETL run.')}
            className={styles.tableContainer}>
            <Table size="md" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('tableName', 'Table')}</TableHeader>
                  <TableHeader>{t('lastSync', 'Last Sync')}</TableHeader>
                  <TableHeader>{t('status', 'Status')}</TableHeader>
                  <TableHeader>{t('duration', 'Duration')}</TableHeader>
                  <TableHeader>{t('records', 'Records')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map(({ id, tableName, info }) => {
                  const ok = info.syncStatus === 'success';
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <span className={styles.tableNameCell}>{tableName}</span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const synced = parseSyncTime(info.lastSync);
                          return synced ? (
                            <DefinitionTooltip definition={synced.format('DD MMM YYYY, HH:mm:ss')} openOnHover>
                              <span className={styles.relativeTime}>{synced.fromNow()}</span>
                            </DefinitionTooltip>
                          ) : (
                            '—'
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Tag type={ok ? 'green' : 'red'} size="sm" renderIcon={ok ? CheckmarkFilled : WarningAltFilled}>
                          {info.syncStatus}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        {info.durationMs != null ? `${info.durationMs.toLocaleString()} ms` : '—'}
                      </TableCell>
                      <TableCell>
                        {info.recordsProcessed != null ? info.recordsProcessed.toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <p className={styles.scheduleNote}>
          {t('syncScheduleNote', 'The ETL also runs automatically on a scheduled interval configured in Administration → Manage Scheduler.')}
        </p>
      </section>

      <RecreateConfirmModal
        open={showConfirmModal}
        onConfirm={handleRecreateConfirmed}
        onClose={() => setShowConfirmModal(false)}
      />
    </div>
  );
};

export default EtlAdmin;
