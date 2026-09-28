import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
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
  type DataTableHeader,
} from '@carbon/react';
import { EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDatetime, parseDate } from '@openmrs/esm-framework';
import { usePatientOrders } from '../resources/hooks/usePatientOrders';
import { type RadiologyOrder } from '../radiology-imaging/types';
import { type Procedure } from '../types';
import ImagingSeriesPanel from '../radiology-imaging/imaging-details/imaging-series/imaging-series-panel.component';
import { FindingsSection, ImpressionBlock } from '../radiology-imaging/reports/report-expanded-content.shared';
import styles from './radiology-imaging-chart-dashboard.scss';

function getDisplayName(value: unknown): string | null {
  if (typeof value === 'object' && value !== null && 'display' in value) {
    const display = (value as { display?: unknown }).display;
    return typeof display === 'string' && display.length > 0 ? display : null;
  }
  return null;
}

function getPerformerDisplay(order: RadiologyOrder, procedure: Procedure | undefined): string {
  return (
    getDisplayName(procedure?.preliminaryReportApprovedBy) ??
    getDisplayName(procedure?.preliminaryReportEnteredBy) ??
    getDisplayName(order.orderer) ??
    '—'
  );
}

/** Matches facility finalized-report detection: FINAL report type or a stored procedure report. */
function isFinalizedProcedure(procedure: Procedure): boolean {
  return procedure.reportType === 'FINAL' || Boolean(procedure.procedureReport);
}

function getPrimaryFinalizedProcedure(order: RadiologyOrder): Procedure | undefined {
  return (order.procedures ?? []).find(isFinalizedProcedure);
}

const ExpandedResultContent: React.FC<{ order: RadiologyOrder }> = ({ order }) => {
  const { t } = useTranslation();
  const finalizedProcedures = (order.procedures ?? []).filter(isFinalizedProcedure);

  if (!finalizedProcedures.length) {
    return <p className={styles.emptyExpanded}>{t('noFinalizedReport', 'No finalized report available.')}</p>;
  }

  return (
    <div className={styles.expandedContent}>
      {finalizedProcedures.map((procedure) => (
        <div key={procedure.uuid} className={styles.procedureReport}>
          <FindingsSection procedure={procedure} />
          {procedure.impressions ? <ImpressionBlock impressions={procedure.impressions} /> : null}
        </div>
      ))}
      <ImagingSeriesPanel orderNumber={order.orderNumber} />
    </div>
  );
};

interface ChartResultsTableProps {
  patientUuid: string;
}

const ChartResultsTable: React.FC<ChartResultsTableProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { orders, isLoading, error, mutate, isValidating } = usePatientOrders(patientUuid);

  const resultOrders = useMemo(
    () => orders.filter((order) => (order.procedures ?? []).some(isFinalizedProcedure)),
    [orders],
  );

  const headers: Array<DataTableHeader> = useMemo(
    () => [
      { key: 'orderNumber', header: t('orderNo', 'Order No') },
      { key: 'orderDate', header: t('orderDate', 'Order Date') },
      { key: 'orderType', header: t('orderType', 'Order Type') },
      { key: 'performer', header: t('performer', 'Performer') },
    ],
    [t],
  );

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('imagingResults', 'Imaging Results')} />;
  }

  if (!resultOrders.length) {
    return (
      <EmptyState
        displayText={t('imagingResultsLower', 'imaging results')}
        headerTitle={t('imagingResults', 'Imaging Results')}
      />
    );
  }

  const rows = resultOrders.map((order) => {
    const procedure = getPrimaryFinalizedProcedure(order);
    return {
      id: order.uuid,
      orderNumber: order.orderNumber,
      orderDate: formatDatetime(parseDate(order.dateActivated), { noToday: true }),
      orderType: order.concept?.display ?? '—',
      performer: getPerformerDisplay(order, procedure),
    };
  });

  const ordersById = new Map(resultOrders.map((order) => [order.uuid, order]));

  return (
    <div className={styles.tableSection}>
      <div className={styles.sectionHeader}>
        <h4 className={styles.sectionTitle}>{t('imagingResults', 'Imaging Results')}</h4>
        <Button kind="ghost" size="sm" onClick={() => mutate()} disabled={isValidating}>
          {t('refresh', 'Refresh')}
        </Button>
      </div>
      <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getExpandedRowProps, getTableProps, getExpandHeaderProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label={t('imagingResults', 'Imaging Results')}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader {...getExpandHeaderProps()} />
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const order = ordersById.get(row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow {...getRowProps({ row })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableExpandRow>
                      <TableExpandedRow
                        className={styles.expandedRow}
                        colSpan={headers.length + 1}
                        {...getExpandedRowProps({ row })}>
                        {order ? <ExpandedResultContent order={order} /> : null}
                      </TableExpandedRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default ChartResultsTable;
