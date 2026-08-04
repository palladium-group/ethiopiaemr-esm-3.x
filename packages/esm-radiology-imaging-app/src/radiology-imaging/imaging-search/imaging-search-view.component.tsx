import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { User, WatsonHealthStudyView } from '@carbon/react/icons';
import { EmptyCard, ErrorCard, ExtensionSlot, formatDatetime, navigate, parseDate } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { usePatientOrders } from '../../resources/hooks/usePatientOrders';
import { getPriorityTagType } from '../../resources/utils';
import styles from './imaging-search-view.scss';

const orderHeaders: Array<DataTableHeader> = [
  { key: 'orderNumber', header: 'Order #' },
  { key: 'procedure', header: 'Procedure' },
  { key: 'urgency', header: 'Urgency' },
  { key: 'status', header: 'Status' },
  { key: 'dateActivated', header: 'Date Ordered' },
  { key: 'orderLocation', header: 'Order Location' },
  { key: 'navigateToDetails', header: 'Actions' },
];

function fulfillerStatusLabel(status: string | null): { label: string; tagType: string } {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'In Progress', tagType: 'blue' };
    case 'COMPLETED':
      return { label: 'Completed', tagType: 'green' };
    case 'DECLINED':
      return { label: 'Declined', tagType: 'red' };
    case 'RECEIVED':
      return { label: 'Received', tagType: 'cyan' };
    case 'ON_HOLD':
      return { label: 'On Hold', tagType: 'warm-gray' };
    case 'EXCEPTION':
      return { label: 'Exception', tagType: 'magenta' };
    case 'DISCONTINUED':
      return { label: 'Discontinued', tagType: 'gray' };
    case 'DRAFT':
      return { label: 'Draft', tagType: 'cool-gray' };
    default:
      return { label: 'New', tagType: 'purple' };
  }
}

const PAGE_SIZE = 10;

const PatientOrdersPanel: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { orders, isLoading, error } = usePatientOrders(patientUuid);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const { pageSizes } = usePaginationInfo(pageSize, orders.length, currentPage, orders.length);

  if (isLoading) {
    return <DataTableSkeleton aria-label={t('patientOrders', 'Patient orders')} showHeader showToolbar />;
  }

  if (error) {
    return <ErrorCard error={error} headerTitle={t('errorLoadingOrders', 'Error loading orders')} />;
  }

  if (orders.length === 0) {
    return (
      <EmptyCard
        headerTitle={t('noOrdersFound', 'No orders found')}
        displayText={t('noOrdersFoundDescription', 'No radiology orders found for this patient.')}
      />
    );
  }

  const { display: patientName, person } = orders[0].patient;
  const description = [person.gender, person.age != null ? `${t('age', 'Age')} ${person.age}` : null]
    .filter(Boolean)
    .join(' · ');

  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tableRows = paginatedOrders.map((order) => {
    const { label, tagType } = fulfillerStatusLabel(order.fulfillerStatus);
    return {
      id: order.uuid,
      orderNumber: order.orderNumber,
      procedure: order.concept.display,
      urgency: (
        <Tag size="sm" type={getPriorityTagType(order.urgency)}>
          {t(order.urgency, order.urgency.replaceAll('_', ' '))}
        </Tag>
      ),
      status: (
        <Tag size="sm" type={tagType as any}>
          {t(label, label)}
        </Tag>
      ),
      dateActivated: formatDatetime(parseDate(order.dateActivated), { noToday: true }),
      orderLocation: order.encounter?.location?.display ?? '—',
      navigateToDetails: (
        <Button
          renderIcon={WatsonHealthStudyView}
          size="sm"
          kind="ghost"
          onClick={() => navigate({ to: `${globalThis.spaBase}/radiology-imaging/imaging-details/${order.uuid}` })}>
          {t('viewDetails', 'View Details')}
        </Button>
      ),
    };
  });

  return (
    <>
      <DataTable size="sm" rows={tableRows} headers={orderHeaders} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps, onInputChange }) => (
          <TableContainer
            title={`${patientName} — ${t('orders', 'Orders')} (${orders.length})`}
            description={description}
            {...getTableContainerProps()}>
            <TableToolbar>
              <TableToolbarContent>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchOrders', 'Search orders')}
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('patientOrders', 'Patient orders')}>
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
        totalItems={orders.length}
      />
    </>
  );
};

const ImagingSearchView: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPatientUuid = searchParams.get('patient');

  const handlePatientSelect = useCallback(
    (patientUuid: string) => {
      setSearchParams({ patient: patientUuid });
    },
    [setSearchParams],
  );

  return (
    <div className={styles.container}>
      <div className={styles.searchPanel}>
        <ExtensionSlot
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: handlePatientSelect,
            buttonProps: { kind: 'secondary', size: 'lg' },
          }}
        />
      </div>

      <div className={styles.ordersPanel}>
        {selectedPatientUuid ? (
          <PatientOrdersPanel patientUuid={selectedPatientUuid} />
        ) : (
          <div className={styles.placeholder}>
            <User size={48} className={styles.placeholderIcon} />
            <p className={styles.placeholderText}>
              {t('searchPatientPrompt', 'Search for a patient above to view their radiology orders.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagingSearchView;
