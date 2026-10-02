import React, { useCallback, useId, useState } from 'react';
import classNames from 'classnames';
import dayjs from 'dayjs';
import {
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  Layer,
  Pagination,
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
  Tag,
  Tile,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import {
  useLayoutType,
  isDesktop,
  useConfig,
  useDebounce,
  ErrorState,
  ConfigurableLink,
  parseDate,
} from '@openmrs/esm-framework';
import { EmptyDataIllustration } from '@openmrs/esm-patient-common-lib';
import { usePagedBills } from '../billing.resource';
import { useCurrencyFormatting } from '../helpers/currency';
import BillLineItems, { lineItemTotal } from './bill-line-items.component';
import styles from './bills-table.scss';

const searchDebounceMs = 500;

const filterItems = [
  { id: '', text: 'All bills' },
  { id: 'PENDING', text: 'Pending bills' },
  { id: 'PAID', text: 'Paid bills' },
  { id: 'EXEMPTED', text: 'Exempted bills' },
  { id: 'POSTED', text: 'Posted bills' },
];

type BillTableProps = {
  defaultBillPaymentStatus?: string;
};

const BillsTable: React.FC<BillTableProps> = ({ defaultBillPaymentStatus = '' }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const id = useId();
  const config = useConfig();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [billPaymentStatus, setBillPaymentStatus] = useState(defaultBillPaymentStatus);
  const pageSizes = config?.bills?.pageSizes ?? [10, 20, 30, 40, 50];
  const [pageSize, setPageSize] = useState(config?.bills?.pageSize ?? 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchString, setSearchString] = useState('');
  // Only one bill's line items are open at a time.
  const [expandedBillUuid, setExpandedBillUuid] = useState<string | null>(null);
  // Wait for a pause in typing before querying the server.
  const debouncedSearchString = useDebounce(searchString, searchDebounceMs);
  const { bills, totalCount, isLoading, error } = usePagedBills({
    billStatus: billPaymentStatus,
    searchTerm: debouncedSearchString,
    page: currentPage,
    pageSize,
  });

  const headerData = [
    {
      header: t('visitTime', 'Visit time'),
      key: 'visitTime',
    },
    {
      header: t('identifier', 'Identifier'),
      key: 'identifier',
    },
    {
      header: t('name', 'Name'),
      key: 'patientName',
    },
    {
      header: t('invoiceNumber', 'Invoice Number'),
      key: 'invoiceNumber',
    },
    {
      header: t('billedItems', 'Billed Items'),
      key: 'billedItems',
    },
    {
      header: t('total', 'Total'),
      key: 'total',
    },
    {
      header: t('status', 'Status'),
      key: 'status',
    },
  ];

  const isSearching = debouncedSearchString.trim() !== '';
  // Show the spinner only for loads the user asked for: a search still being typed, or a new search, filter
  // or page being fetched. Background refreshes (for example when the window regains focus) stay silent.
  const isFetchingForUser = isLoading || searchString !== debouncedSearchString;

  // Bills are reused across days, so only list the items added today. Items without a creation date are kept.
  const isAddedToday = (item) => {
    const dateCreated = item?.auditInfo?.dateCreated;
    return !dateCreated || dayjs(parseDate(dateCreated)).isSame(dayjs(), 'day');
  };

  const todaysLineItems = (bill) => bill?.lineItems?.filter(isAddedToday) ?? [];

  const billingUrl = '${openmrsSpaBase}/home/accounting/patient/${patientUuid}/${uuid}';

  const rowData = bills?.map((bill) => ({
    id: bill.uuid,
    uuid: bill.uuid,
    patientName: (
      <ConfigurableLink
        style={{ textDecoration: 'none', maxWidth: '50%' }}
        to={billingUrl}
        templateParams={{ patientUuid: bill.patientUuid, uuid: bill.uuid }}>
        {bill.patientName}
      </ConfigurableLink>
    ),
    invoiceNumber: bill.receiptNumber ?? '--',
    visitTime: bill.visitStartDatetime ?? '--',
    identifier: bill.identifier,
    department: '--',
    billedItems: `${todaysLineItems(bill).length} ${
      todaysLineItems(bill).length === 1 ? t('itemLowercase', 'item') : t('itemsLowercase', 'items')
    }`,
    total: formatCurrency(todaysLineItems(bill).reduce((sum, lineItem) => sum + lineItemTotal(lineItem), 0)),
    billingPrice: '--',
    status: bill.closed ? (
      <>
        {bill.status}{' '}
        <Tag size="sm" type="gray">
          {t('closed', 'Closed')}
        </Tag>
      </>
    ) : (
      bill.status
    ),
  }));

  const handleSearch = useCallback((e) => {
    setCurrentPage(1);
    setSearchString(e.target.value);
  }, []);

  const handleFilterChange = ({ selectedItem }) => {
    setCurrentPage(1);
    setBillPaymentStatus(selectedItem.id);
  };

  // Only show the skeleton on the very first load; later page/search changes keep the previous rows visible.
  if (isLoading && !bills) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          rowCount={pageSize}
          showHeader={false}
          showToolbar={false}
          zebra
          columnCount={headerData?.length}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Layer>
          <ErrorState error={error} headerTitle={t('billsList', 'Bill list')} />
        </Layer>
      </div>
    );
  }

  return (
    <>
      <div className={styles.filterContainer}>
        <Dropdown
          className={styles.filterDropdown}
          direction="bottom"
          id={`filter-${id}`}
          initialSelectedItem={filterItems.find((item) => item.id === billPaymentStatus)}
          items={filterItems}
          itemToString={(item) => (item ? item.text : '')}
          label=""
          onChange={handleFilterChange}
          size={responsiveSize}
          titleText={t('filterBy', 'Filter by') + ':'}
          type="inline"
        />
      </div>

      {totalCount > 0 || isSearching ? (
        <div className={styles.billListContainer}>
          <FilterableTableHeader
            handleSearch={handleSearch}
            isFetching={isFetchingForUser}
            layout={layout}
            responsiveSize={responsiveSize}
            t={t}
          />
          <DataTable
            isSortable
            rows={rowData}
            headers={headerData}
            size={responsiveSize}
            useZebraStyles={rowData?.length > 1 ? true : false}>
            {({ rows, headers, getRowProps, getTableProps, getExpandedRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label="bill list">
                  <TableHead>
                    <TableRow>
                      <TableExpandHeader />
                      {headers.map((header) => (
                        <TableHeader key={header.key}>{header.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <React.Fragment key={row.id}>
                        <TableExpandRow
                          {...getRowProps({ row })}
                          isExpanded={row.id === expandedBillUuid}
                          onExpand={() => setExpandedBillUuid(row.id === expandedBillUuid ? null : row.id)}
                          aria-label={
                            row.id === expandedBillUuid
                              ? t('hideLineItems', 'Hide line items')
                              : t('showLineItems', 'Show line items')
                          }>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableExpandRow>
                        {row.id === expandedBillUuid && (
                          <TableExpandedRow
                            className={styles.expandedRow}
                            colSpan={headers.length + 1}
                            {...getExpandedRowProps({ row })}>
                            <BillLineItems lineItems={todaysLineItems(bills?.find((bill) => bill.uuid === row.id))} />
                          </TableExpandedRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
          {bills?.length === 0 && (
            <div className={styles.filterEmptyState}>
              <Layer level={0}>
                <Tile className={styles.filterEmptyStateTile}>
                  <p className={styles.filterEmptyStateContent}>
                    {t('noMatchingBillsToDisplay', 'No matching bills to display')}
                  </p>
                  <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
                </Tile>
              </Layer>
            </div>
          )}
          {totalCount > 0 && (
            <Pagination
              forwardText="Next page"
              backwardText="Previous page"
              page={currentPage}
              pageSize={pageSize}
              pageSizes={pageSizes}
              totalItems={totalCount}
              className={styles.pagination}
              size={responsiveSize}
              onChange={({ pageSize: newPageSize, page: newPage }) => {
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                } else if (newPage !== currentPage) {
                  setCurrentPage(newPage);
                }
              }}
            />
          )}
        </div>
      ) : (
        <Layer className={styles.emptyStateContainer}>
          <Tile className={styles.tile}>
            <div className={styles.illo}>
              <EmptyDataIllustration />
            </div>
            <p className={styles.content}>There are no bills to display.</p>
          </Tile>
        </Layer>
      )}
    </>
  );
};

function FilterableTableHeader({ layout, handleSearch, isFetching, responsiveSize, t }) {
  return (
    <>
      <div className={styles.headerContainer}>
        <div
          className={classNames({
            [styles.tabletHeading]: !isDesktop(layout),
            [styles.desktopHeading]: isDesktop(layout),
          })}>
          <h4>{t('billList', 'Bill list')}</h4>
        </div>
        <div className={styles.backgroundDataFetchingIndicator}>
          <span>{isFetching ? <InlineLoading /> : null}</span>
        </div>
      </div>
      <Search
        labelText=""
        placeholder={t('searchBillsPlaceholder', 'Search by patient name, identifier or invoice number')}
        onChange={handleSearch}
        size={responsiveSize}
      />
    </>
  );
}

export default BillsTable;
