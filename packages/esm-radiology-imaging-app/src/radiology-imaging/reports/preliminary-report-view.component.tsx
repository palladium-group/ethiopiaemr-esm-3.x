import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProcedures } from '../../resources/hooks/useProcedures';
import {
  DataTable,
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
  DataTableSkeleton,
  Button,
  Tag,
} from '@carbon/react';

import styles from './preliminary-report-view.scss';
import { ErrorCard, navigate } from '@openmrs/esm-framework';
import { WatsonHealthStudyView } from '@carbon/react/icons';

const PreliminaryReportView: React.FC = () => {
  const { t } = useTranslation();
  const { orders = [], isLoading, error, mutate } = useProcedures('PRELIMINARY');
  const headers = [
    { key: 'orderId', header: 'Order ID' },
    { key: 'patientName', header: 'Patient Name' },
    { key: 'procedureName', header: 'Procedure Name' },
    { key: 'orderedBy', header: 'Ordered By' },
    { key: 'status', header: 'Status' },
    { key: 'navigateToDetails', header: 'Actions' },
  ];

  const tableRows = orders.map((order) => ({
    id: order.uuid,
    orderId: order.parentOrder.orderNumber,
    patientName: order.parentOrder.patient.display,
    procedureName: order.parentOrder.concept.display,
    orderedBy: order.parentOrder.orderer.display,
    status:
      order.status === 'REVISION_REQUESTED' ? (
        <Tag type="red">{t('revisionRequested', 'Revision requested')}</Tag>
      ) : (
        <Tag type="blue">{t('pendingReview', 'Pending review')}</Tag>
      ),
    navigateToDetails: (
      <Button
        renderIcon={WatsonHealthStudyView}
        size="sm"
        kind="ghost"
        onClick={() =>
          navigate({ to: `${globalThis.spaBase}/radiology-imaging/imaging-details/${order.parentOrder.uuid}` })
        }>
        {t('viewImages', 'View Images')}
      </Button>
    ),
  }));

  if (isLoading) {
    return <DataTableSkeleton aria-label={t('preliminaryReports', 'Preliminary reports')} showHeader showToolbar />;
  }

  if (error) {
    return <ErrorCard error={error} headerTitle={t('preliminaryReports', 'Preliminary reports')} />;
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
        }) => {
          return (
            <TableContainer
              title={t('radiologyOrders', 'Radiology Orders')}
              description={t('radiologyOrdersDescription', 'All radiology imaging orders.')}
              {...getTableContainerProps()}>
              <TableToolbar {...getToolbarProps()}>
                <TableToolbarContent className={styles.toolbarContent}>
                  <TableToolbarSearch
                    persistent
                    onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    placeholder={t('searchOrders', 'Search orders')}
                  />
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()} aria-label={t('radiologyOrders', 'Radiology orders')}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <React.Fragment key={row.id}>
                      <TableRow {...getRowProps({ row })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </DataTable>
    </div>
  );
};

export default PreliminaryReportView;
