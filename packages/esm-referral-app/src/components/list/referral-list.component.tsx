import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  InlineNotification,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { Renew, WarningAlt } from '@carbon/react/icons';
import { useDebounce } from '@openmrs/esm-framework';
import { useReferrals } from '../../api/referral.resource';
import type { ReferralDirection, ReferralStatus } from '../../api/types';
import { formatRelative } from '../../utils/format';
import { useCodeLabel } from '../../utils/labels';
import { PriorityTag, StatusTag } from '../shared/status-tag.component';
import styles from './referral-list.scss';

const ALL = 'ALL';
/** Statuses that need someone at this facility to act, per direction. */
const ACTIONABLE: Record<ReferralDirection, string> = {
  INCOMING: 'REFERRED,ACCEPTED',
  OUTGOING: 'DRAFT,PENDING_LIAISON',
};
const ACTION_NEEDED = 'ACTION_NEEDED';
const STATUSES: Array<ReferralStatus> = [
  'DRAFT',
  'PENDING_LIAISON',
  'REFERRED',
  'ACCEPTED',
  'REJECTED',
  'REFERRED_BACK',
  'RE_REFERRED',
  'FEEDBACK_SENT',
  'COMPLETED',
  'CANCELLED',
];

interface ReferralListProps {
  direction: ReferralDirection;
}

const ReferralList: React.FC<ReferralListProps> = ({ direction }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useCodeLabel();
  const [filter, setFilter] = useState<string>(ACTION_NEEDED);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, error, isLoading, isUpdating, mutate } = useReferrals({
    direction,
    status: filter === ACTION_NEEDED ? ACTIONABLE[direction] : filter,
    q: debouncedQuery,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  const rows = data?.rows ?? [];
  const isIncoming = direction === 'INCOMING';
  const filterItems = [ACTION_NEEDED, ALL, ...STATUSES];
  const filterLabel = (item: string) =>
    item === ACTION_NEEDED
      ? t('needsAction', 'Needs action')
      : item === ALL
      ? t('allStatuses', 'All statuses')
      : label('status', item);

  return (
    <div>
      <div className={styles.toolbar}>
        <Search
          size="md"
          className={styles.search}
          labelText={t('searchReferrals', 'Search referrals')}
          placeholder={t('searchPlaceholder', 'Search by patient name or MRN')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <Dropdown
          id={`referral-status-${direction}`}
          className={styles.filter}
          size="md"
          type="inline"
          titleText={t('show', 'Show')}
          label={filterLabel(filter)}
          items={filterItems}
          itemToString={(item: string | null) => (item ? filterLabel(item) : '')}
          selectedItem={filter}
          onChange={({ selectedItem }: { selectedItem: string }) => {
            setFilter(selectedItem);
            setPage(1);
          }}
        />
        <Button kind="ghost" size="md" renderIcon={Renew} onClick={() => mutate()}>
          {t('refresh', 'Refresh')}
        </Button>
        {isUpdating && <InlineLoading description={t('updatingList', 'Updating…')} />}
      </div>

      {isLoading && <DataTableSkeleton columnCount={7} rowCount={6} showHeader={false} showToolbar={false} />}

      {error && !isLoading && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('referralsLoadError', 'Could not load referrals.')}
          subtitle={error.message}
        />
      )}

      {!isLoading && !error && rows.length === 0 && (
        <Tile className={styles.empty}>
          <p className={styles.emptyTitle}>
            {filter === ACTION_NEEDED
              ? t('nothingToAction', 'Nothing waiting on you.')
              : t('noReferralsMatch', 'No referrals match.')}
          </p>
          <p className={styles.emptyHint}>
            {isIncoming
              ? t('incomingEmptyHint', 'Referrals sent to this facility appear here as soon as they arrive.')
              : t('outgoingEmptyHint', 'Referrals created at this facility appear here.')}
          </p>
        </Tile>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <>
          <TableContainer className={styles.table} aria-busy={isUpdating}>
            <Table size="md" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('patient', 'Patient')}</TableHeader>
                  <TableHeader>{isIncoming ? t('from', 'From') : t('to', 'To')}</TableHeader>
                  <TableHeader>{t('service', 'Service')}</TableHeader>
                  <TableHeader>{t('priority', 'Priority')}</TableHeader>
                  <TableHeader>{t('status', 'Status')}</TableHeader>
                  <TableHeader>{t('updated', 'Updated')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const counterpart = isIncoming
                    ? row.referringFacilityName ?? row.referringFacilityCode
                    : row.receivingFacilityName ?? row.receivingFacilityCode;
                  const undelivered = !isIncoming && row.status === 'REFERRED' && !row.delivered;
                  return (
                    <TableRow
                      key={row.uuid}
                      className={styles.row}
                      onClick={() => navigate(`/${row.uuid}`)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/${row.uuid}`)}>
                      <TableCell>
                        <span className={styles.patientName}>{row.patientName ?? '—'}</span>
                        <span className={styles.secondary}>
                          {[row.patientMrn, label('patientType', row.patientType)].filter(Boolean).join(' · ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {counterpart ?? <span className={styles.secondary}>{t('notChosen', 'Not chosen')}</span>}
                      </TableCell>
                      <TableCell>{row.requestedService ?? '—'}</TableCell>
                      <TableCell>
                        <PriorityTag priority={row.priority} />
                      </TableCell>
                      <TableCell>
                        <div className={styles.statusCell}>
                          <StatusTag status={row.status} />
                          {undelivered && (
                            <span className={styles.undelivered} title={t('awaitingDelivery', 'Awaiting delivery')}>
                              <WarningAlt size={16} />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatRelative(row.respondedDate ?? row.submittedDate ?? row.dateCreated)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            page={page}
            pageSize={pageSize}
            pageSizes={[10, 20, 50]}
            totalItems={data?.total ?? 0}
            onChange={({ page: p, pageSize: ps }: { page: number; pageSize: number }) => {
              setPage(p);
              setPageSize(ps);
            }}
          />
        </>
      )}
    </div>
  );
};

export default ReferralList;
