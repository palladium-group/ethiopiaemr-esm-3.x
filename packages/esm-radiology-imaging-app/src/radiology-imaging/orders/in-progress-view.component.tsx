import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  type DataTableHeader,
  Tag,
  Button,
} from '@carbon/react';
import { ErrorCard, formatDatetime, navigate, parseDate } from '@openmrs/esm-framework';
import { WatsonHealthStudyView } from '@carbon/react/icons';
import { getPriorityTagType } from '../../resources/utils';
import { useOrders } from '../../resources/hooks/useOrders';
import RadiologyEmptyState from '../shared/radiology-empty-state.component';
import RadiologyFilters, {
  type RadiologyFilterValues,
  getDateRange,
  getScheduledFetchRange,
  isOrderInFilterDateRange,
} from '../../components/filters/radiology-filters.component';
import { useFilterParams } from '../../components/filters/useFilterParams';
import WorklistStatusCell from './worklist-status-cell.component';
import styles from './in-progress-view.scss';

const DEFAULT_FILTERS: RadiologyFilterValues = {
  dateRangePreset: 'today',
  priority: 'all',
  status: 'IN_PROGRESS',
};

const headers: Array<DataTableHeader> = [
  { key: 'orderNumber', header: 'Order #' },
  { key: 'patient', header: 'Patient' },
  { key: 'procedure', header: 'Procedure' },
  { key: 'urgency', header: 'Urgency' },
  { key: 'dateActivated', header: 'Date Ordered' },
  { key: 'orderLocation', header: 'Order Location' },
  { key: 'worklist', header: 'Worklist' },
  { key: 'navigateToDetails', header: 'Actions' },
];

const InProgressView: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useFilterParams(DEFAULT_FILTERS);

  const [filterFrom, filterTo] = getDateRange(filters);
  const { orders: allOrders, isLoading, error } = useOrders(getScheduledFetchRange(), 'IN_PROGRESS');

  const orders = allOrders
    .filter((o) => o.fulfillerComment !== 'Images acquired')
    .filter((o) => filters.priority === 'all' || o.urgency === filters.priority)
    .filter((o) => isOrderInFilterDateRange(o, filterFrom, filterTo));

  const tableRows = orders.map((order) => ({
    id: order.uuid,
    orderNumber: order.orderNumber,
    patient: order.patient.display,
    procedure: order.concept.display,
    urgency: (
      <Tag size="sm" type={getPriorityTagType(order.urgency)}>
        {t(order.urgency, order.urgency.replaceAll('_', ' '))}
      </Tag>
    ),
    orderLocation: order.encounter?.location?.display ?? '—',
    dateActivated: formatDatetime(parseDate(order.dateActivated), { noToday: true }),
    worklist: <WorklistStatusCell key={order.uuid} order={order} />,
    navigateToDetails: (
      <Button
        renderIcon={WatsonHealthStudyView}
        size="sm"
        kind="ghost"
        onClick={() => navigate({ to: `${globalThis.spaBase}/radiology-imaging/imaging-details/${order.uuid}` })}>
        {t('viewDetails', 'View Details')}
      </Button>
    ),
  }));

  if (isLoading) {
    return (
      <div className={styles.container}>
        <DataTableSkeleton aria-label={t('inProgressOrders', 'In progress orders')} showHeader showToolbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorCard error={error} headerTitle={t('inProgressOrders', 'In progress orders')} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.container}>
        <RadiologyEmptyState
          filters={filters}
          onFiltersChange={setFilters}
          showStatusFilter={false}
          description={t(
            'noInProgressOrders',
            'There are no orders currently in progress for the selected date range and priority.',
          )}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <RadiologyFilters values={filters} onChange={setFilters} showStatusFilter={false} />
      <DataTable size="sm" useZebraStyles rows={tableRows} headers={headers}>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps, onInputChange }) => (
          <TableContainer
            title={t('inProgressView', 'In Progress')}
            description={t(
              'inProgressViewDescription',
              'Radiology orders currently being acquired by the radiologist.',
            )}
            {...getTableContainerProps()}>
            <TableToolbar size="sm">
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchInProgressOrders', 'Search in progress orders')}
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('inProgressOrders', 'In progress orders')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default InProgressView;
