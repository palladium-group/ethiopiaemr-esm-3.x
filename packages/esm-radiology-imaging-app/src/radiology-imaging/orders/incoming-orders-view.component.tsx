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
import { ErrorCard, formatDatetime, navigate, parseDate, showModal } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { Calendar, Close, Send, WatsonHealthStudyView } from '@carbon/react/icons';
import { useOrders } from '../../resources/hooks/useOrders';
import { useScheduleAppointment } from '../../resources/hooks/useScheduleAppointment';
import { useRadiologyPrivileges } from '../../resources/hooks/useRadiologyPrivileges';
import { getFulfillerStatusLabel, getPriorityTagType } from '../../resources/utils';
import RadiologyEmptyState from '../shared/radiology-empty-state.component';
import RadiologyFilters, {
  type RadiologyFilterValues,
  getDateRange,
  getFulfillerStatus,
} from '../../components/filters/radiology-filters.component';
import { useFilterParams } from '../../components/filters/useFilterParams';
import styles from './incoming-orders-view.scss';

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: RadiologyFilterValues = {
  dateRangePreset: 'today',
  priority: 'all',
  status: 'unassigned',
};

const headers: Array<DataTableHeader> = [
  { key: 'orderNumber', header: 'Order #' },
  { key: 'patient', header: 'Patient' },
  { key: 'procedure', header: 'Procedure' },
  { key: 'urgency', header: 'Urgency' },
  { key: 'dateActivated', header: 'Date Ordered' },
  { key: 'orderLocation', header: 'Order Location' },
  { key: 'status', header: 'Status' },
  { key: 'navigateToDetails', header: 'Actions' },
];

const IncomingOrdersView: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useFilterParams(DEFAULT_FILTERS);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const dateRange = getDateRange(filters);
  const fulfillerStatus = getFulfillerStatus(filters.status);

  const { orders, isLoading, error, goTo, currentPage, totalCount, mutate } = useOrders(dateRange, fulfillerStatus);
  const { scheduleAppointment, isScheduling } = useScheduleAppointment(() => mutate());
  const { canScheduleAppointment } = useRadiologyPrivileges();
  const { pageSizes } = usePaginationInfo(pageSize, totalCount, currentPage, orders.length);

  // Scheduled orders live in the dedicated Scheduled Orders view, so keep them out of Incoming.
  const unscheduledOrders = orders.filter((o) => !o.scheduledDate);
  const filteredOrders =
    filters.priority === 'all' ? unscheduledOrders : unscheduledOrders.filter((o) => o.urgency === filters.priority);

  const handleReferOrderExternally = (orderUuid: string) => {
    const dispose = showModal('refer-order-external-modal', {
      orderUuid,
      mutate,
      closeModal: () => dispose(),
    });
  };

  const handleRejectOrder = (orderUuid: string) => {
    const dispose = showModal('reject-order-modal', {
      orderUuid,
      mutate,
      closeModal: () => dispose(),
    });
  };

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
    status: getFulfillerStatusLabel(order.fulfillerStatus, t),
    navigateToDetails: (
      <div className={styles.actions}>
        {order.fulfillerStatus !== 'EXCEPTION' && (
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
        )}
        {order.fulfillerStatus === null && (
          <Button
            hasIconOnly
            renderIcon={Send}
            size="sm"
            kind="tertiary"
            onClick={() => handleReferOrderExternally(order.uuid)}
            tooltipAlignment="start"
            tooltipPosition="left"
            iconDescription={t('referOrderIconDescription', 'Refer order')}>
            {t('referOrder', 'Refer Order')}
          </Button>
        )}
        {order.fulfillerStatus === null && !order.scheduledDate && canScheduleAppointment && (
          <Button
            hasIconOnly
            renderIcon={Calendar}
            size="sm"
            kind="tertiary"
            disabled={isScheduling}
            onClick={() => scheduleAppointment(order)}
            tooltipAlignment="start"
            tooltipPosition="left"
            iconDescription={t('scheduleAppointmentIconDescription', 'Schedule appointment')}>
            {t('scheduleAppointment', 'Schedule')}
          </Button>
        )}
        {order.fulfillerStatus === null && (
          <Button
            hasIconOnly
            renderIcon={Close}
            size="sm"
            kind="danger--tertiary"
            tooltipAlignment="start"
            tooltipPosition="left"
            iconDescription={t('rejectOrderIconDescription', 'Reject order')}
            onClick={() => handleRejectOrder(order.uuid)}
          />
        )}
      </div>
    ),
  }));

  if (isLoading) {
    return (
      <div className={styles.container}>
        <DataTableSkeleton aria-label={t('radiologyOrders', 'Radiology orders')} showHeader showToolbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorCard error={error} headerTitle={t('radiologyOrders', 'Radiology orders')} />
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className={styles.container}>
        <RadiologyEmptyState
          filters={filters}
          onFiltersChange={setFilters}
          showStatusFilter
          description={t(
            'noOrdersMatchingFilters',
            'There are currently no records matching your selected filters for "{{status}}" status.',
            { status: filters.status === 'unassigned' ? 'Unassigned' : filters.status },
          )}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <RadiologyFilters values={filters} onChange={setFilters} showStatusFilter />
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
            title={t('incomingOrders', 'Incoming Orders')}
            description={t('incomingOrdersDescription', 'All incoming radiology imaging orders.')}
            {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchIncomingOrders', 'Search incoming orders')}
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('incomingOrders', 'Incoming orders')}>
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

export default IncomingOrdersView;
