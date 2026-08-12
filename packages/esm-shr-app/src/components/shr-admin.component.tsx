import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Button,
  DataTableSkeleton,
  DefinitionTooltip,
  Dropdown,
  InlineLoading,
  InlineNotification,
  Pagination,
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
import { CheckmarkFilled, WarningAltFilled, Time, Renew, Send, DataTable as DataTableIcon } from '@carbon/react/icons';
import {
  extractErrorMessage,
  retryRow,
  syncPending,
  useShrOutbox,
  type ShrOutboxRow,
  type ShrOutboxStatus,
} from '../api/shr.resource';
import styles from './shr-admin.component.scss';

dayjs.extend(relativeTime);

const PAGE_SIZE = 20;
const ALL = 'ALL';

/** Lifecycle order, so the chips read left-to-right as a record's journey. */
const STATUSES: Array<ShrOutboxStatus> = ['PENDING', 'SUBMITTED', 'SENT', 'FAILED', 'DEAD_LETTER'];

/**
 * Maps an outbox status to a Carbon Tag colour.
 *
 * SUBMITTED is deliberately blue rather than green: the record has been handed to OpenFn, which is
 * not the same as landing in the SHR. Only SENT means delivered.
 */
function statusPresentation(status: ShrOutboxStatus | null): {
  type: 'green' | 'red' | 'blue' | 'magenta' | 'gray';
  icon?: typeof CheckmarkFilled;
} {
  switch (status) {
    case 'SENT':
      return { type: 'green', icon: CheckmarkFilled };
    case 'SUBMITTED':
      return { type: 'blue', icon: Time };
    case 'PENDING':
      return { type: 'gray', icon: Time };
    case 'FAILED':
      return { type: 'red', icon: WarningAltFilled };
    case 'DEAD_LETTER':
      return { type: 'magenta', icon: WarningAltFilled };
    default:
      return { type: 'gray' };
  }
}

const ShrAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const busy = syncing || retryingId !== null;
  const unmountRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    return () => {
      unmountRef.current.abort();
    };
  }, []);

  // Polling pauses while an action is in flight: a refresh landing mid-push would redraw the table
  // under the user and could show a row in a state the action is about to change.
  const { outbox, isLoading, error, mutate } = useShrOutbox(filter, (page - 1) * pageSize, pageSize, busy ? 0 : 30_000);

  const unknownError = t('unknownError', 'Unknown error');

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      ALL: t('allStatuses', 'All statuses'),
      PENDING: t('statusPending', 'Pending'),
      SUBMITTED: t('statusSubmitted', 'Submitted'),
      SENT: t('statusSent', 'Sent'),
      FAILED: t('statusFailed', 'Failed'),
      DEAD_LETTER: t('statusDeadLetter', 'Dead letter'),
    }),
    [t],
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setNotification(null);
    try {
      const result = await syncPending(unmountRef.current.signal);
      if (result.status === 'success') {
        setNotification({ kind: 'success', message: result.message ?? t('syncDone', 'Sync complete.') });
      } else {
        setNotification({
          kind: 'error',
          message: t('syncError', 'Sync failed: {{message}}', { message: result.message ?? unknownError }),
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      setNotification({
        kind: 'error',
        message: t('syncError', 'Sync failed: {{message}}', { message: extractErrorMessage(e) ?? unknownError }),
      });
    } finally {
      if (!unmountRef.current.signal.aborted) {
        setSyncing(false);
        mutate();
      }
    }
  }, [t, mutate, unknownError]);

  const handleRetry = useCallback(
    async (outboxId: number) => {
      setRetryingId(outboxId);
      setNotification(null);
      try {
        const result = await retryRow(outboxId, unmountRef.current.signal);
        if (result.status === 'success') {
          setNotification({
            kind: 'success',
            message: result.message ?? t('retryDone', 'Record {{id}} requeued.', { id: outboxId }),
          });
        } else {
          setNotification({
            kind: 'error',
            message: t('retryError', 'Retry failed: {{message}}', { message: result.message ?? unknownError }),
          });
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        setNotification({
          kind: 'error',
          message: t('retryError', 'Retry failed: {{message}}', { message: extractErrorMessage(e) ?? unknownError }),
        });
      } finally {
        if (!unmountRef.current.signal.aborted) {
          setRetryingId(null);
          mutate();
        }
      }
    },
    [t, mutate, unknownError],
  );

  const counts = outbox?.counts ?? {};
  const rows: Array<ShrOutboxRow> = outbox?.rows ?? [];

  const overview = useMemo(() => {
    const pending = counts['PENDING'] ?? 0;
    const failed = (counts['FAILED'] ?? 0) + (counts['DEAD_LETTER'] ?? 0);
    const total = outbox?.grandTotal ?? 0;
    return { pending, failed, total, healthy: total > 0 && failed === 0 && pending === 0 };
  }, [counts, outbox]);

  // Newest activity in the queue, as a human-readable "x minutes ago".
  const lastActivity = useMemo(() => {
    return rows.reduce<dayjs.Dayjs | null>((acc, r) => {
      const raw = r.dateChanged ?? r.dateCreated;
      if (!raw) {
        return acc;
      }
      const parsed = dayjs(raw);
      if (!parsed.isValid()) {
        return acc;
      }
      return !acc || parsed.isAfter(acc) ? parsed : acc;
    }, null);
  }, [rows]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('shrAdministration', 'Shared Health Record Administration')}</h2>
        <p className={styles.description}>
          {t(
            'shrAdminDescription',
            'Clinical records captured here are queued and sent to the national Shared Health Record by a scheduled task. Use this page to send queued records immediately and to retry records that failed.',
          )}
        </p>
      </header>

      {/* ── Overview strip ────────────────────────────────────────── */}
      {!isLoading && !error && (
        <section className={styles.heroStrip} aria-label={t('overview', 'Overview')}>
          <Tile className={styles.metricTile}>
            <div className={styles.metricIcon}>
              {overview.failed > 0 ? (
                <WarningAltFilled size={24} className={styles.iconWarning} />
              ) : overview.healthy ? (
                <CheckmarkFilled size={24} className={styles.iconHealthy} />
              ) : (
                <Time size={24} className={styles.iconNeutral} />
              )}
            </div>
            <div className={styles.metricBody}>
              <span className={styles.metricLabel}>{t('queueHealth', 'Queue health')}</span>
              <span className={styles.metricValue}>
                {overview.total === 0
                  ? t('noRecords', 'No records')
                  : overview.failed > 0
                  ? t('nNeedAttention', '{{count}} need attention', { count: overview.failed })
                  : overview.pending > 0
                  ? t('nWaiting', '{{count}} waiting', { count: overview.pending })
                  : t('allSent', 'All sent')}
              </span>
            </div>
          </Tile>

          <Tile className={styles.metricTile}>
            <div className={styles.metricIcon}>
              <Time size={24} className={styles.iconNeutral} />
            </div>
            <div className={styles.metricBody}>
              <span className={styles.metricLabel}>{t('lastActivity', 'Last activity')}</span>
              <span className={styles.metricValue}>{lastActivity ? lastActivity.fromNow() : t('never', 'Never')}</span>
            </div>
          </Tile>

          <Tile className={styles.metricTile}>
            <div className={styles.metricIcon}>
              <DataTableIcon size={24} className={styles.iconNeutral} />
            </div>
            <div className={styles.metricBody}>
              <span className={styles.metricLabel}>{t('recordsQueued', 'Records in outbox')}</span>
              <span className={styles.metricValue}>{overview.total.toLocaleString()}</span>
            </div>
          </Tile>
        </section>
      )}

      {/* ── Status breakdown ──────────────────────────────────────── */}
      {!isLoading && !error && (
        <section className={styles.chipRow} aria-label={t('statusBreakdown', 'Status breakdown')}>
          {STATUSES.map((s) => {
            const { type } = statusPresentation(s);
            const n = counts[s] ?? 0;
            return (
              <div key={s} className={`${styles.chip} ${n === 0 ? styles.chipZero : ''}`}>
                <Tag type={n === 0 ? 'gray' : type} size="sm">
                  {statusLabels[s]}
                </Tag>
                <span className={styles.chipCount}>{n.toLocaleString()}</span>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Action card ───────────────────────────────────────────── */}
      <section className={styles.actionGrid} aria-label={t('actions', 'Actions')}>
        <Tile className={styles.actionCard}>
          <div className={styles.actionCardHeader}>
            <Send size={20} className={styles.iconNeutral} />
            <h3 className={styles.actionCardTitle}>{t('sendQueued', 'Send queued records')}</h3>
            <Tag type="blue" size="sm">
              {t('upToN', 'Up to {{count}} at a time', { count: 50 })}
            </Tag>
          </div>
          <p className={styles.actionCardBody}>
            {t(
              'sendQueuedHelp',
              'Sends records that are waiting, without waiting for the scheduled task. Records are handed to OpenFn, which delivers them to the SHR — their status becomes Sent once delivery is confirmed.',
            )}
          </p>
          <Button
            kind="primary"
            size="md"
            renderIcon={Send}
            disabled={busy || (overview.pending === 0 && !isLoading)}
            onClick={handleSync}>
            {syncing ? <InlineLoading description={t('sending', 'Sending…')} /> : t('sendNow', 'Send now')}
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

      {/* ── Outbox table ──────────────────────────────────────────── */}
      <section className={styles.statusSection} aria-label={t('outbox', 'Outbox')}>
        {isLoading && <DataTableSkeleton columnCount={7} rowCount={5} showHeader={false} showToolbar={false} />}

        {error && !isLoading && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('outboxError', 'Could not load the outbox.')}
            subtitle={error.message}
          />
        )}

        {!isLoading && !error && (
          <>
            <div className={styles.tableToolbar}>
              <Dropdown
                id="shr-status-filter"
                className={styles.filterDropdown}
                size="md"
                titleText={t('filterByStatus', 'Status')}
                label={statusLabels[filter]}
                items={[ALL, ...STATUSES]}
                itemToString={(item: string) => statusLabels[item] ?? item}
                selectedItem={filter}
                onChange={({ selectedItem }: { selectedItem: string }) => {
                  setFilter(selectedItem);
                  setPage(1);
                }}
              />
              <Button kind="ghost" size="md" renderIcon={Renew} disabled={busy} onClick={() => mutate()}>
                {t('refresh', 'Refresh')}
              </Button>
            </div>

            {rows.length === 0 ? (
              <Tile className={styles.emptyTile}>
                <DataTableIcon size={32} className={styles.iconNeutral} />
                <p className={styles.empty}>
                  {filter === ALL
                    ? t('outboxEmpty', 'No records in the outbox.')
                    : t('outboxEmptyFiltered', 'No records with this status.')}
                </p>
              </Tile>
            ) : (
              <>
                <TableContainer
                  title={t('outboxTitle', 'Outbox')}
                  description={t('outboxDesc', 'Records queued for the Shared Health Record, newest first.')}
                  className={styles.tableContainer}>
                  <Table size="md" useZebraStyles>
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t('recordType', 'Record')}</TableHeader>
                        <TableHeader>{t('operation', 'Operation')}</TableHeader>
                        <TableHeader>{t('status', 'Status')}</TableHeader>
                        <TableHeader>{t('attempts', 'Attempts')}</TableHeader>
                        <TableHeader>{t('queued', 'Queued')}</TableHeader>
                        <TableHeader>{t('lastError', 'Last error')}</TableHeader>
                        <TableHeader>{t('action', 'Action')}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const { type: tagType, icon: StatusIcon } = statusPresentation(row.status);
                        const created = row.dateCreated ? dayjs(row.dateCreated) : null;
                        return (
                          <TableRow key={row.outboxId}>
                            <TableCell>
                              <span className={styles.resourceType}>{row.resourceType ?? '—'}</span>
                              <span className={styles.resourceId}>#{row.outboxId}</span>
                            </TableCell>
                            <TableCell>{row.operation ?? '—'}</TableCell>
                            <TableCell>
                              <Tag type={tagType} size="sm" renderIcon={StatusIcon}>
                                {row.status ? statusLabels[row.status] ?? row.status : '—'}
                              </Tag>
                            </TableCell>
                            <TableCell>{row.retryCount}</TableCell>
                            <TableCell>
                              {created && created.isValid() ? (
                                <DefinitionTooltip definition={created.format('DD MMM YYYY, HH:mm:ss')} openOnHover>
                                  <span className={styles.relativeTime}>{created.fromNow()}</span>
                                </DefinitionTooltip>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              {row.lastError ? (
                                // Errors run to ~300 characters and would otherwise set the row
                                // height for the whole table. Clamp to two lines; the tooltip
                                // carries the full text.
                                <DefinitionTooltip definition={row.lastError} openOnHover>
                                  <span className={styles.errorText}>{row.lastError}</span>
                                </DefinitionTooltip>
                              ) : (
                                <span className={styles.noError}>—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.retryable ? (
                                <Button
                                  kind="tertiary"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => handleRetry(row.outboxId)}>
                                  {retryingId === row.outboxId ? (
                                    <InlineLoading description={t('retrying', 'Retrying…')} />
                                  ) : (
                                    t('retry', 'Retry')
                                  )}
                                </Button>
                              ) : (
                                <span className={styles.noError}>—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Pagination
                  className={styles.pagination}
                  page={page}
                  pageSize={pageSize}
                  pageSizes={[10, 20, 50, 100]}
                  totalItems={outbox?.total ?? 0}
                  onChange={({ page: p, pageSize: ps }: { page: number; pageSize: number }) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                />
              </>
            )}
          </>
        )}

        {!isLoading && !error && (
          <p className={styles.scheduleNote}>
            {t(
              'shrScheduleNote',
              'Records are also sent automatically by the SHR Sync Task, on the interval configured in Administration → Manage Scheduler.',
            )}
          </p>
        )}
      </section>
    </div>
  );
};

export default ShrAdmin;
