import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../../resources/hooks/useOrders';
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
  type DataTableHeader,
  Tag,
  Button,
} from '@carbon/react';
import { getPriorityTagType } from '../../resources/utils';
import { formatDatetime, parseDate, navigate } from '@openmrs/esm-framework';
import styles from './image-acquired-view.scss';
import { WatsonHealthStudyView } from '@carbon/react/icons';
import RadiologyEmptyState from '../shared/radiology-empty-state.component';
import RadiologyFilters, {
  getDateRange,
  getScheduledFetchRange,
  isOrderInFilterDateRange,
  type RadiologyFilterValues,
} from '../../components/filters/radiology-filters.component';
import { useFilterParams } from '../../components/filters/useFilterParams';

const headers: Array<DataTableHeader> = [
  { key: 'orderNumber', header: 'Order #' },
  { key: 'patient', header: 'Patient' },
  { key: 'procedure', header: 'Procedure' },
  { key: 'urgency', header: 'Urgency' },
  { key: 'dateActivated', header: 'Date Ordered' },
  { key: 'orderLocation', header: 'Order Location' },
  { key: 'navigateToDetails', header: 'Actions' },
];

const DEFAULT_FILTERS: RadiologyFilterValues = {
  dateRangePreset: 'today',
  priority: 'all',
  status: 'COMPLETED',
};

const ImageAcquiredView: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useFilterParams(DEFAULT_FILTERS);
  const [filterFrom, filterTo] = getDateRange(filters);
  const { orders: allOrders } = useOrders(getScheduledFetchRange(), 'IN_PROGRESS', 'Images acquired');

  const orders = allOrders.filter((o) => isOrderInFilterDateRange(o, filterFrom, filterTo));

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
    navigateToDetails: (
      <Button
        renderIcon={WatsonHealthStudyView}
        size="sm"
        kind="ghost"
        onClick={() => navigate({ to: `${globalThis.spaBase}/radiology-imaging/imaging-details/${order.uuid}` })}>
        {t('viewImages', 'View Images')}
      </Button>
    ),
  }));

  if (orders.length === 0) {
    return (
      <div className={styles.container}>
        <RadiologyEmptyState
          description={t('noImageAcquiredOrders', 'No image acquired orders')}
          filters={filters}
          onFiltersChange={setFilters}
          showStatusFilter={false}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <RadiologyFilters values={filters} onChange={setFilters} showStatusFilter={false} />
      <DataTable size="md" rows={tableRows} headers={headers} isSortable useZebraStyles>
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
              title={t('imageAcquiredView', 'Image Acquired')}
              description={t('imageAcquiredViewDescription', 'All radiology imaging orders that have been acquired.')}
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
              <Table {...getTableProps()} aria-label={t('imageAcquiredView', 'Image Acquired')}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row, index) => (
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

export default ImageAcquiredView;
