import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tag,
  type DataTableHeader,
} from '@carbon/react';
import { EmptyState, ErrorState, useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { formatDatetime, parseDate } from '@openmrs/esm-framework';
import { usePatientOrders } from '../resources/hooks/usePatientOrders';
import { getPriorityTagType } from '../resources/utils';
import ChartResultsTable from './chart-results-table.component';
import styles from './radiology-imaging-chart-dashboard.scss';

export interface RadiologyImagingChartDashboardProps {
  patient: fhir.Patient;
}

function fulfillerStatusTag(status: string | null, t: (key: string, fallback: string) => string) {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: t('inProgress', 'In progress'), type: 'blue' as const };
    case 'COMPLETED':
      return { label: t('completed', 'Completed'), type: 'green' as const };
    case 'DECLINED':
      return { label: t('declined', 'Declined'), type: 'red' as const };
    case 'RECEIVED':
      return { label: t('received', 'Received'), type: 'cyan' as const };
    case 'ON_HOLD':
      return { label: t('onHold', 'On hold'), type: 'warm-gray' as const };
    case 'EXCEPTION':
      return { label: t('exception', 'Exception'), type: 'magenta' as const };
    case 'DISCONTINUED':
      return { label: t('discontinued', 'Discontinued'), type: 'gray' as const };
    case 'DRAFT':
      return { label: t('draft', 'Draft'), type: 'cool-gray' as const };
    default:
      return { label: '—', type: 'gray' as const };
  }
}

const ChartOrdersTable: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { orders, isLoading, error } = usePatientOrders(patientUuid);
  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');

  const headers: Array<DataTableHeader> = useMemo(
    () => [
      { key: 'orderNumber', header: t('orderNo', 'Order No') },
      { key: 'dateOrdered', header: t('dateOrdered', 'Date Ordered') },
      { key: 'order', header: t('order', 'Order') },
      { key: 'orderReason', header: t('orderReason', 'Order reason') },
      { key: 'priority', header: t('priority', 'Priority') },
      { key: 'orderBy', header: t('orderBy', 'Order By') },
      { key: 'status', header: t('status', 'Status') },
    ],
    [t],
  );

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('radiologyImagingOrders', 'Radiology & Imaging Orders')} />;
  }

  if (!orders.length) {
    return (
      <EmptyState
        displayText={t('radiologyOrdersLower', 'radiology orders')}
        headerTitle={t('radiologyImagingOrders', 'Radiology & Imaging Orders')}
        launchForm={launchOrderBasket}
      />
    );
  }

  const rows = orders.map((order) => {
    const status = fulfillerStatusTag(order.fulfillerStatus, t);
    return {
      id: order.uuid,
      orderNumber: order.orderNumber,
      dateOrdered: formatDatetime(parseDate(order.dateActivated), { noToday: true }),
      order: order.concept?.display ?? '—',
      orderReason: order.orderReason?.display ?? order.orderReasonNonCoded ?? '—',
      priority: (
        <Tag size="sm" type={getPriorityTagType(order.urgency)}>
          {order.urgency.replaceAll('_', ' ')}
        </Tag>
      ),
      orderBy: order.orderer?.display ?? '—',
      status: (
        <Tag size="sm" type={status.type}>
          {status.label}
        </Tag>
      ),
    };
  });

  return (
    <div className={styles.tableSection}>
      <div className={styles.sectionHeader}>
        <h4 className={styles.sectionTitle}>{t('radiologyImagingOrders', 'Radiology & Imaging Orders')}</h4>
        <Button kind="ghost" size="sm" onClick={launchOrderBasket}>
          {t('addOrderPlus', 'Add Order +')}
        </Button>
      </div>
      <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label={t('radiologyImagingOrders', 'Radiology & Imaging Orders')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
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

const RadiologyImagingChartDashboard: React.FC<RadiologyImagingChartDashboardProps> = ({ patient }) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const patientUuid = patient.id;

  return (
    <div className={styles.dashboard}>
      <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex: index }) => setSelectedIndex(index)}>
        <TabList aria-label={t('radiologyAndImaging', 'Radiology and Imaging')} contained>
          <Tab>{t('orders', 'Orders')}</Tab>
          <Tab>{t('results', 'Results')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ChartOrdersTable patientUuid={patientUuid} />
          </TabPanel>
          <TabPanel>
            <ChartResultsTable patientUuid={patientUuid} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default RadiologyImagingChartDashboard;
