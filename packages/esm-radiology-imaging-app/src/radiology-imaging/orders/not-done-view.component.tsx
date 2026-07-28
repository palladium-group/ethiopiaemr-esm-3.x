import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  type DataTableHeader,
} from '@carbon/react';
import { ErrorCard, formatDatetime, navigate, parseDate } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { WatsonHealthStudyView } from '@carbon/react/icons';
import { useOrders } from '../../resources/hooks/useOrders';
import { getPriorityTagType } from '../../resources/utils';
import RadiologyEmptyState from '../shared/radiology-empty-state.component';
import RadiologyFilters, {
  getDateRange,
  type RadiologyFilterValues,
} from '../../components/filters/radiology-filters.component';
import { useFilterParams } from '../../components/filters/useFilterParams';
import styles from './not-done-view.scss';

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: RadiologyFilterValues = {
  dateRangePreset: 'today',
  priority: 'all',
  status: 'DECLINED',
};

const headers: Array<DataTableHeader> = [
  { key: 'orderNumber', header: 'Order #' },
  { key: 'patient', header: 'Patient' },
  { key: 'procedure', header: 'Procedure' },
  { key: 'urgency', header: 'Urgency' },
  { key: 'dateActivated', header: 'Date Ordered' },
  { key: 'orderLocation', header: 'Order Location' },
  { key: 'reason', header: 'Reason Not Done' },
  { key: 'actions', header: 'Actions' },
];

const NotDoneView: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useFilterParams(DEFAULT_FILTERS);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const dateRange = getDateRange(filters);
  const { orders, isLoading, error, goTo, currentPage, totalCount } = useOrders(dateRange, 'DECLINED');
  const { pageSizes } = usePaginationInfo(pageSize, totalCount, currentPage, orders.length);

  const filteredOrders = filters.priority === 'all' ? orders : orders.filter((o) => o.urgency === filters.priority);

  const tableRows = filteredOrders.map((order) => ({
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
    reason: order.fulfillerComment ?? '—',
    actions: (
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
        <DataTableSkeleton aria-label={t('notDoneOrders', 'Not done orders')} showHeader showToolbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorCard error={error} headerTitle={t('notDoneOrders', 'Not done orders')} />
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className={styles.container}>
        <RadiologyEmptyState
          filters={filters}
          onFiltersChange={setFilters}
          showStatusFilter={false}
          description={t('noNotDoneOrders', 'There are no orders marked as not done for the selected date range.')}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <RadiologyFilters values={filters} onChange={setFilters} showStatusFilter={false} />
      <DataTable size="sm" rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getToolbarProps,
          getTableProps,
          getTableContainerProps,
          onInputChange,
        }) => (
          <TableContainer
            title={t('notDone', 'Not Done')}
            description={t('notDoneDescription', 'Radiology orders that were declined or not performed.')}
            {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchNotDoneOrders', 'Search not done orders')}
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('notDoneOrders', 'Not done orders')}>
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
      <Pagination
        backwardText={t('previous', 'Previous')}
        forwardText={t('next', 'Next')}
        itemsPerPageText={t('itemsPerPage', 'Items per page:')}
        onChange={({ page, pageSize: ps }) => {
          goTo(page);
          setPageSize(ps);
        }}
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes}
        totalItems={totalCount}
      />
    </div>
  );
};

export default NotDoneView;
