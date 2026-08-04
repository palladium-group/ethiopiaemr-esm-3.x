import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
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
import { Calendar, WatsonHealthStudyView } from '@carbon/react/icons';
import { ErrorCard, formatDatetime, navigate, parseDate } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { useAllOrders } from '../../resources/hooks/useOrders';
import { useScheduleAppointment } from '../../resources/hooks/useScheduleAppointment';
import { useRadiologyPrivileges } from '../../resources/hooks/useRadiologyPrivileges';
import { getFulfillerStatusLabel, getPriorityTagType } from '../../resources/utils';
import { inferModalityFromConcept } from '../../resources/pacs.resource';
import RadiologyEmptyState from '../shared/radiology-empty-state.component';
import RadiologyFilters, {
  type RadiologyFilterValues,
  getDateRange,
  getScheduledFetchRange,
} from '../../components/filters/radiology-filters.component';
import { useFilterParams } from '../../components/filters/useFilterParams';
import styles from './scheduled-orders-view.scss';

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: RadiologyFilterValues = {
  dateRangePreset: 'today',
  priority: 'all',
  status: 'unassigned',
  modality: 'all',
};

const headers: Array<DataTableHeader> = [
  { key: 'orderNumber', header: 'Order #' },
  { key: 'patient', header: 'Patient' },
  { key: 'procedure', header: 'Procedure' },
  { key: 'scheduledDate', header: 'Scheduled Date/Time' },
  { key: 'urgency', header: 'Urgency' },
  { key: 'orderLocation', header: 'Order Location' },
  { key: 'status', header: 'Status' },
  { key: 'navigateToDetails', header: 'Actions' },
];

const ScheduledOrdersView: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useFilterParams(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const { canScheduleAppointment } = useRadiologyPrivileges();

  // Range the *scheduled date* must fall within (driven by the date filter).
  const [scheduledFrom, scheduledTo] = getDateRange(filters);

  const { orders, isLoading, error, mutate } = useAllOrders(getScheduledFetchRange(), null);
  const { scheduleAppointment, isScheduling } = useScheduleAppointment(() => mutate());

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.dateRangePreset, filters.customStart, filters.customEnd, filters.modality]);

  const scheduledOrders = orders.filter((order) => {
    if (order.scheduledDate == null || order.fulfillerStatus !== null) {
      return false;
    }
    const scheduled = dayjs(order.scheduledDate);
    return !scheduled.isBefore(scheduledFrom) && !scheduled.isAfter(scheduledTo);
  });

  const filteredOrders =
    !filters.modality || filters.modality === 'all'
      ? scheduledOrders
      : scheduledOrders.filter((order) => inferModalityFromConcept(order.concept.display) === filters.modality);

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, filteredOrders.length, currentPage, paginatedOrders.length);

  const tableRows = paginatedOrders.map((order) => ({
    id: order.uuid,
    orderNumber: order.orderNumber,
    patient: order.patient.display,
    procedure: order.concept.display,
    scheduledDate: formatDatetime(parseDate(order.scheduledDate!), { noToday: true }),
    urgency: (
      <Tag size="sm" type={getPriorityTagType(order.urgency)}>
        {t(order.urgency, order.urgency.replaceAll('_', ' '))}
      </Tag>
    ),
    orderLocation: order.encounter?.location?.display ?? '—',
    status: getFulfillerStatusLabel(order.fulfillerStatus, t),
    navigateToDetails: (
      <div className={styles.actions}>
        <Button
          hasIconOnly
          renderIcon={WatsonHealthStudyView}
          tooltipAlignment="start"
          tooltipPosition="left"
          iconDescription={t('viewDetailsIconDescription', 'View details')}
          size="sm"
          onClick={() => navigate({ to: `${globalThis.spaBase}/radiology-imaging/imaging-details/${order.uuid}` })}>
          {t('viewDetails', 'View Details')}
        </Button>
        {canScheduleAppointment && order.fulfillerStatus !== 'IN_PROGRESS' && (
          <Button
            hasIconOnly
            renderIcon={Calendar}
            size="sm"
            kind="tertiary"
            disabled={isScheduling}
            onClick={() => scheduleAppointment(order)}
            tooltipAlignment="start"
            tooltipPosition="left"
            iconDescription={t('rescheduleAppointmentIconDescription', 'Reschedule appointment')}>
            {t('rescheduleAppointment', 'Reschedule')}
          </Button>
        )}
      </div>
    ),
  }));

  if (isLoading) {
    return (
      <div className={styles.container}>
        <DataTableSkeleton aria-label={t('scheduledOrders', 'Scheduled orders')} showHeader showToolbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorCard error={error} headerTitle={t('scheduledOrders', 'Scheduled orders')} />
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className={styles.container}>
        <RadiologyEmptyState
          filters={filters}
          onFiltersChange={setFilters}
          showPriorityFilter={false}
          showModalityFilter
          dateRangeLabel={t('scheduledDate', 'Scheduled Date')}
          description={t(
            'noScheduledOrdersMatchingFilters',
            'There are currently no scheduled orders matching your selected filters.',
          )}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <RadiologyFilters
        values={filters}
        onChange={setFilters}
        showPriorityFilter={false}
        showModalityFilter
        dateRangeLabel={t('scheduledDate', 'Scheduled Date')}
      />
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
            title={t('scheduledOrders', 'Scheduled Orders')}
            description={t('scheduledOrdersDescription', 'Radiology orders with a scheduled appointment date.')}
            {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchScheduledOrders', 'Search scheduled orders')}
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('scheduledOrders', 'Scheduled orders')}>
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
          setCurrentPage(page);
          setPageSize(ps);
        }}
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes}
        totalItems={filteredOrders.length}
      />
    </div>
  );
};

export default ScheduledOrdersView;
