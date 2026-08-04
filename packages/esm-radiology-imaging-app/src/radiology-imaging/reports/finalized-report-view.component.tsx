import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProcedures } from '../../resources/hooks/useProcedures';
import {
  Button,
  DataTable,
  DataTableSkeleton,
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
import { EmptyCard, ErrorCard, formatDatetime, parseDate, navigate } from '@openmrs/esm-framework';
import styles from './preliminary-report-view.scss';

const headers: Array<DataTableHeader> = [
  { key: 'orderId', header: 'Order ID' },
  { key: 'patientName', header: 'Patient Name' },
  { key: 'procedureName', header: 'Procedure Name' },
  { key: 'approvedBy', header: 'Approved By' },
  { key: 'approvedAt', header: 'Approved At' },
  { key: 'status', header: 'Status' },
];

const FinalizedReportView: React.FC = () => {
  const { t } = useTranslation();
  const { orders = [], isLoading, error } = useProcedures('FINAL');

  const tableRows = orders.map((order) => ({
    id: order.uuid,
    orderId: order.parentOrder.orderNumber,
    patientName: order.parentOrder.patient.display,
    procedureName: order.parentOrder.concept.display,
    approvedBy:
      typeof order.preliminaryReportApprovedBy === 'object' && order.preliminaryReportApprovedBy !== null
        ? order.preliminaryReportApprovedBy.display
        : '—',
    approvedAt: order.preliminaryReportApprovedAt
      ? formatDatetime(parseDate(order.preliminaryReportApprovedAt), { noToday: false })
      : '—',
    status: (
      <Tag type="green" size="sm">
        {t('final', 'Final')}
      </Tag>
    ),
  }));

  if (isLoading) {
    return (
      <div className={styles.container}>
        <DataTableSkeleton aria-label={t('finalizedReports', 'Finalized reports')} showHeader showToolbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorCard error={error} headerTitle={t('finalizedReports', 'Finalized reports')} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyCard
          headerTitle={t('noFinalizedReports', 'No finalized reports')}
          displayText={t('noFinalizedReportsDescription', 'No finalized radiology reports found.')}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
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
            title={t('finalizedReports', 'Finalized Reports')}
            description={t('finalizedReportsDescription', 'Radiology orders with approved and finalized reports.')}
            {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchReports', 'Search reports')}
                />
              </TableToolbarContent>
            </TableToolbar>

            <Table {...getTableProps()} aria-label={t('finalizedReports', 'Finalized reports')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                  <TableHeader aria-label={t('actions', 'Actions')} />
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                    <TableCell className="cds--table-column-menu">
                      <Button
                        size="sm"
                        kind="ghost"
                        onClick={() =>
                          navigate({
                            to: `${globalThis.spaBase}/radiology-imaging/finalized-report/${orders[index].uuid}`,
                          })
                        }>
                        {t('viewResults', 'View Results')}
                      </Button>
                    </TableCell>
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

export default FinalizedReportView;
