import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import capitalize from 'lodash-es/capitalize';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbarContent,
  Tag,
  Tile,
} from '@carbon/react';
import {
  AddIcon,
  ExtensionSlot,
  formatDate,
  OpenmrsDateRangePicker,
  parseDate,
  useLayoutType,
  usePagination,
} from '@openmrs/esm-framework';
import {
  CardHeader,
  EmptyState,
  ErrorState,
  type OrderUrgency,
  PatientChartPagination,
  useLaunchWorkspaceRequiringVisit,
  useOrderTypes,
  usePatientOrders,
} from '@openmrs/esm-patient-common-lib';
import { isOmrsOrder, ORDER_TYPES } from './order-basket-items';
import { getOrderStatus, type OrderStatusFilter, type OrderStatusKey, withoutReplacedOrders } from './order-status';
import GeneralOrderDetails from './general-order-details.component';
import MedicationRecord from './medication-record.component';
import OrderRowActions from './order-row-actions.component';
import styles from './patient-orders-table.scss';

type PatientOrdersTableProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const pageSize = 10;

function getPriorityTagType(urgency: OrderUrgency) {
  switch (urgency) {
    case 'STAT':
      return 'red';
    case 'ON_SCHEDULED_DATE':
      return 'purple';
    default:
      return 'green';
  }
}

/** The patient's orders in one table, whatever their state, replacing the active-only table in the Orders page. */
const PatientOrdersTable: React.FC<PatientOrdersTableProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');
  const { data: orderTypes } = useOrderTypes();
  const [selectedOrderTypeUuid, setSelectedOrderTypeUuid] = useState<string>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter | 'all'>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;

  // Passing no status keeps the stopped orders that the 'ACTIVE' status leaves out
  const {
    data: orders,
    error,
    isLoading,
    isValidating,
  } = usePatientOrders(
    patientUuid,
    undefined,
    selectedOrderTypeUuid,
    startDate ? dayjs(startDate).format('YYYY-MM-DD') : null,
    endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
  );

  const statusLabels: Record<OrderStatusKey, string> = {
    active: t('active', 'Active'),
    received: t('received', 'Received'),
    inProgress: t('inProgress', 'In progress'),
    onHold: t('onHold', 'On hold'),
    exception: t('exception', 'Exception'),
    declined: t('declined', 'Declined'),
    completed: t('completed', 'Completed'),
    cancelled: t('cancelled', 'Cancelled'),
    expired: t('expired', 'Expired'),
  };

  const tableHeaders = [
    { key: 'orderNumber', header: t('orderNumber', 'Order number') },
    { key: 'dateOfOrder', header: t('dateOfOrder', 'Date of order') },
    { key: 'orderType', header: t('orderType', 'Order type') },
    { key: 'order', header: t('order', 'Order') },
    { key: 'priority', header: t('priority', 'Priority') },
    { key: 'orderedBy', header: t('orderedBy', 'Ordered by') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const statusFilters: Array<{ id: OrderStatusFilter | 'all'; text: string }> = [
    { id: 'all', text: t('allStatuses', 'All statuses') },
    { id: 'attention', text: t('needsAttention', 'Needs attention') },
    { id: 'active', text: t('active', 'Active') },
    { id: 'completed', text: t('completed', 'Completed') },
    { id: 'cancelled', text: t('cancelled', 'Cancelled') },
  ];

  const orderTypesToDisplay = useMemo(
    () => [
      { display: t('allOrders', 'All orders'), uuid: null },
      ...(orderTypes?.map(({ display, uuid }) => ({ display, uuid })) ?? []),
    ],
    [orderTypes, t],
  );

  const displayedOrders = useMemo(
    () =>
      withoutReplacedOrders(orders ?? [])
        .map((order) => ({ order, status: getOrderStatus(order) }))
        .filter(({ status }) => selectedStatus === 'all' || status.filter === selectedStatus),
    [orders, selectedStatus],
  );

  const tableRows = useMemo(
    () =>
      displayedOrders.map(({ order, status }) => ({
        id: order.uuid,
        orderNumber: order.orderNumber,
        dateOfOrder: <div className={styles.singleLineText}>{formatDate(parseDate(order.dateActivated))}</div>,
        orderType: capitalize(order.orderType?.display ?? '-'),
        order: order.display,
        priority: (
          <Tag type={getPriorityTagType(order.urgency)}>
            {t(order.urgency, capitalize(order.urgency.replaceAll('_', ' ')))}
          </Tag>
        ),
        orderedBy: order.orderer?.display,
        status: <Tag type={status.tagType}>{statusLabels[status.key]}</Tag>,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayedOrders, t],
  );

  const { results: paginatedRows, goTo, currentPage } = usePagination(tableRows, pageSize);

  const handleAdd = useCallback(() => launchOrderBasket(null, { encounterUuid: '' }), [launchOrderBasket]);
  const hasOrders = orders?.length > 0 || selectedStatus !== 'all';

  return (
    <div className={styles.container}>
      <div className={styles.filterContainer}>
        <div className={styles.dropdownContainer}>
          <Dropdown
            id="orderTypeDropdown"
            items={orderTypesToDisplay}
            itemToString={(orderType) => orderType?.display ?? ''}
            label={t('allOrders', 'All orders')}
            onChange={({ selectedItem }) => setSelectedOrderTypeUuid(selectedItem?.uuid ?? null)}
            selectedItem={orderTypesToDisplay.find(({ uuid }) => uuid === selectedOrderTypeUuid)}
            titleText={t('selectOrderType', 'Select order type') + ':'}
            type="inline"
          />
        </div>
        <div className={styles.dropdownContainer}>
          <Dropdown
            id="orderStatusDropdown"
            items={statusFilters}
            itemToString={(status) => status?.text ?? ''}
            label={t('allStatuses', 'All statuses')}
            onChange={({ selectedItem }) => setSelectedStatus(selectedItem.id)}
            selectedItem={statusFilters.find(({ id }) => id === selectedStatus)}
            titleText={t('status', 'Status') + ':'}
            type="inline"
          />
        </div>
        <OpenmrsDateRangePicker
          className={styles.inlineDateRange}
          labelText={t('dateRange', 'Date range') + ':'}
          maxDate={new Date()}
          onChange={([from, to]) => setDateRange([from ?? null, to ?? null])}
          value={dateRange}
        />
      </div>

      {isLoading ? (
        <DataTableSkeleton role="progressbar" compact={!isTablet} zebra />
      ) : error ? (
        <ErrorState error={error} headerTitle={t('orders', 'Orders')} />
      ) : !hasOrders ? (
        <EmptyState
          headerTitle={t('orders', 'Orders')}
          displayText={t('ordersLower', 'orders')}
          launchForm={handleAdd}
        />
      ) : (
        <div className={styles.widgetCard}>
          <CardHeader title={t('orders', 'Orders')}>
            {isValidating ? (
              <span>
                <InlineLoading />
              </span>
            ) : null}
            <div className={styles.buttons}>
              <Button
                className={styles.button}
                kind="ghost"
                renderIcon={AddIcon}
                iconDescription={t('launchOrderBasket', 'Launch order basket')}
                onClick={handleAdd}>
                {t('add', 'Add')}
              </Button>
            </div>
          </CardHeader>
          <DataTable
            aria-label={t('orderDetails', 'Order details')}
            data-floating-menu-container
            headers={tableHeaders}
            overflowMenuOnHover={!isTablet}
            rows={paginatedRows}
            size={isTablet ? 'lg' : 'md'}
            useZebraStyles>
            {({
              getExpandedRowProps,
              getExpandHeaderProps,
              getHeaderProps,
              getRowProps,
              getTableContainerProps,
              getTableProps,
              headers,
              onInputChange,
              rows,
            }) => (
              <>
                <TableContainer {...getTableContainerProps()}>
                  <div className={styles.toolBarContent}>
                    <TableToolbarContent>
                      <Search
                        isExpanded
                        labelText={t('searchTable', 'Search table')}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onInputChange(event)}
                        placeholder={t('searchTable', 'Search table')}
                      />
                    </TableToolbarContent>
                  </div>
                  <Table className={styles.table} {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                        {headers.map((header) => (
                          <TableHeader {...getHeaderProps({ header })} isSortable={false}>
                            {header.header}
                          </TableHeader>
                        ))}
                        <TableExpandHeader />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const { order, status } = displayedOrders.find((item) => item.order.uuid === row.id);
                        const isExpandable =
                          order.type === ORDER_TYPES.DRUG_ORDER || order.type === ORDER_TYPES.GENERAL_ORDER;
                        const cells = row.cells.map((cell) => <TableCell key={cell.id}>{cell.value}</TableCell>);
                        const actionCell = (
                          <TableCell className="cds--table-column-menu">
                            {isOmrsOrder(order) ? (
                              <OrderRowActions actions={status.actions} order={order} patient={patient} />
                            ) : (
                              <ExtensionSlot
                                name={`${order.type}-action-menu-items-slot`}
                                state={{ className: styles.menuItem, orderItem: order }}
                              />
                            )}
                          </TableCell>
                        );

                        return (
                          <React.Fragment key={row.id}>
                            {isExpandable ? (
                              <TableExpandRow className={styles.row} {...getRowProps({ row })}>
                                {cells}
                                {actionCell}
                              </TableExpandRow>
                            ) : (
                              <TableRow className={styles.row} {...getRowProps({ row })}>
                                <TableCell />
                                {cells}
                                {actionCell}
                              </TableRow>
                            )}
                            {isExpandable &&
                              (row.isExpanded ? (
                                <TableExpandedRow colSpan={headers.length + 2} {...getExpandedRowProps({ row })}>
                                  {order.type === ORDER_TYPES.DRUG_ORDER ? (
                                    <MedicationRecord medication={order} />
                                  ) : (
                                    <GeneralOrderDetails order={order} />
                                  )}
                                </TableExpandedRow>
                              ) : (
                                <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                              ))}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {rows.length === 0 ? (
                  <div className={styles.tileContainer}>
                    <Tile className={styles.emptyStateTile}>
                      <div className={styles.tileContent}>
                        <p className={styles.content}>
                          {t('noMatchingOrdersToDisplay', 'No matching orders to display')}
                        </p>
                        <p className={styles.helperText}>{t('checkFilters', 'Check the filters above')}</p>
                      </div>
                    </Tile>
                  </div>
                ) : null}
              </>
            )}
          </DataTable>
          <div className={styles.paginationContainer}>
            <PatientChartPagination
              pageNumber={currentPage}
              totalItems={tableRows.length}
              currentItems={paginatedRows.length}
              pageSize={pageSize}
              onPageNumberChange={({ page }) => goTo(page)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientOrdersTable;
