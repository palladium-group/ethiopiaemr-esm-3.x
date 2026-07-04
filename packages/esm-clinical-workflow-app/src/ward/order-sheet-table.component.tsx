import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
} from '@carbon/react';
import { EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDate, isDesktop, parseDate, useLayoutType, usePagination } from '@openmrs/esm-framework';
import type { OrderSheet } from './order-sheet.resource';
import styles from './orderSheet-tabs.scss';

interface OrderSheetTableProps {
  orders: Array<OrderSheet>;
  isLoading: boolean;
  error?: Error;
}

const OrderSheetTable: React.FC<OrderSheetTableProps> = ({ orders, isLoading, error }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [10, 20, 30, 40, 50];

  const headers = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'patientCondition', header: t('patientCondition', 'Patient Condition') },
    { key: 'diet', header: t('diet', 'Diet') },
    { key: 'ambulation', header: t('ambulation', 'Ambulation') },
    { key: 'nonDrugOrder', header: t('nonDrugOrder', 'Non drug orders') },
  ];

  const { results: paginatedOrders, currentPage, goTo } = usePagination(orders, pageSize);

  const rows = useMemo(
    () =>
      paginatedOrders.map((order) => ({
        id: order.id,
        date: formatDate(parseDate(order.date), { mode: 'wide' }),
        patientCondition: order.patientCondition || '--',
        diet: order.diet || '--',
        ambulation: order.ambulation || '--',
        nonDrugOrder: order.nonDrugOrder || '--',
      })),
    [paginatedOrders],
  );

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" compact={isDesktop(layout)} zebra />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('orderSheet', 'Order Sheet')} />;
  }

  if (!orders.length) {
    return (
      <EmptyState displayText={t('orderSheetLowercase', 'order sheet')} headerTitle={t('orderSheet', 'Order Sheet')} />
    );
  }

  return (
    <div className={styles.tableContainer}>
      <DataTable rows={rows} headers={headers} size={isTablet ? 'lg' : 'sm'} useZebraStyles>
        {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => (
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
        backwardText={t('previousPage', 'Previous page')}
        forwardText={t('nextPage', 'Next page')}
        itemsPerPageText={t('itemsPerPage', 'Items per page:')}
        page={currentPage}
        pageNumberText={t('pageNumber', 'Page Number')}
        pageSize={pageSize}
        pageSizes={pageSizes}
        size={isDesktop(layout) ? 'md' : 'sm'}
        totalItems={orders.length}
        onChange={({ page, pageSize: newPageSize }) => {
          setPageSize(newPageSize);
          if (page !== currentPage) {
            goTo(page);
          }
        }}
      />
    </div>
  );
};

export default OrderSheetTable;
