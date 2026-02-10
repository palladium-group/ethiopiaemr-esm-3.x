import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import {
  DataTable,
  DataTableSkeleton,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
} from '@carbon/react';
import {
  ConfigurableLink,
  formatDatetime,
  isDesktop,
  useLayoutType,
  useConfig,
  usePagination,
  type Visit,
} from '@openmrs/esm-framework';
import { DEFAULT_PAGE_SIZES } from '../../constants';
import styles from './visits-table.component.scss';

interface VisitsTableProps {
  visits: Array<Visit>;
  isLoading: boolean;
  tableHeading: string;
  totalCount: number;
  pageSize: number;
  currentPage: number;
  onPaginationChange: (params: { page: number; pageSize: number }) => void;
  useLocalPagination?: boolean;
}

const VisitsTable: React.FC<VisitsTableProps> = ({
  visits,
  isLoading,
  tableHeading,
  totalCount,
  pageSize,
  currentPage,
  onPaginationChange,
  useLocalPagination = false,
}) => {
  const { t } = useTranslation();
  const [searchString, setSearchString] = useState('');
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const config = useConfig();
  const customPatientChartUrl =
    config?.customPatientChartUrl || '${openmrsSpaBase}/patient/${patientUuid}/chart/Visits';

  // Client-side search filtering
  const searchResults = useMemo(() => {
    if (!visits || visits.length === 0) {
      return [];
    }
    if (!searchString || searchString.trim() === '') {
      return visits;
    }

    const search = searchString.toLowerCase();
    return visits.filter((visit) => {
      const patientName = visit.patient?.person?.display?.toLowerCase() || '';
      const identifier = visit.patient?.identifiers?.[0]?.identifier?.toLowerCase() || '';
      const location = visit.location?.display?.toLowerCase() || '';
      const visitType = visit.visitType?.display?.toLowerCase() || '';

      return (
        patientName.includes(search) ||
        identifier.includes(search) ||
        location.includes(search) ||
        visitType.includes(search)
      );
    });
  }, [visits, searchString]);

  // Local pagination for Past visits (when useLocalPagination is true)
  const {
    results: paginatedResults,
    goTo: goToLocalPage,
    currentPage: localCurrentPage,
  } = usePagination(useLocalPagination ? searchResults : visits, useLocalPagination ? pageSize : visits.length);

  // Sync local pagination page size when it changes from parent
  useEffect(() => {
    if (useLocalPagination && localCurrentPage !== 1) {
      // Reset to page 1 when page size changes
      goToLocalPage(1);
    }
  }, [pageSize, useLocalPagination, goToLocalPage, localCurrentPage]);

  // Use paginated results for local pagination, otherwise use search results
  const displayVisits = useLocalPagination ? paginatedResults : searchResults;

  const headerData = [
    { header: t('patientName', 'Patient Name'), key: 'patientName' },
    { header: t('identifier', 'Identifier'), key: 'identifier' },
    { header: t('visitType', 'Visit Type'), key: 'visitType' },
    { header: t('location', 'Location'), key: 'location' },
    { header: t('startTime', 'Start Time'), key: 'startTime' },
    { header: t('endTime', 'End Time'), key: 'endTime' },
    { header: t('status', 'Status'), key: 'status' },
  ];

  const rowData = displayVisits?.map((visit) => {
    const patientUuid = visit.patient?.uuid;
    const patientName = visit.patient?.person?.display || '--';
    const identifier = visit.patient?.identifiers?.[0]?.identifier || '--';
    const visitType = visit.visitType?.display || '--';
    const location = visit.location?.display || '--';
    const startTime = visit.startDatetime ? formatDatetime(new Date(visit.startDatetime)) : '--';
    const endTime = visit.stopDatetime ? formatDatetime(new Date(visit.stopDatetime)) : '--';
    const status = visit.stopDatetime ? t('ended', 'Ended') : t('active', 'Active');

    return {
      id: visit.uuid,
      patientName: patientUuid ? (
        <ConfigurableLink className={styles.link} to={customPatientChartUrl} templateParams={{ patientUuid }}>
          {patientName}
        </ConfigurableLink>
      ) : (
        patientName
      ),
      identifier,
      visitType,
      location,
      startTime,
      endTime,
      status,
    };
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(e.target.value);
    // Reset to page 1 when searching with local pagination
    if (useLocalPagination) {
      goToLocalPage(1);
    }
  };

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" rowCount={5} columnCount={headerData.length} />;
  }

  if (!visits || visits.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>{t('noVisitsFound', 'No visits found')}</p>
      </div>
    );
  }

  return (
    <div className={styles.visitsTableContainer}>
      <div className={styles.tableHeader}>
        <h4>{tableHeading}</h4>
      </div>
      <Search
        labelText={t('searchVisits', 'Search visits')}
        placeholder={t('searchTable', 'Search table')}
        onChange={handleSearch}
        size={responsiveSize}
        value={searchString}
      />
      <DataTable rows={rowData} headers={headerData} isSortable size={responsiveSize} useZebraStyles>
        {({ rows, headers, getHeaderProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value?.content ?? cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {totalCount > 0 && (
        <Pagination
          backwardText={t('previousPage', 'Previous page')}
          forwardText={t('nextPage', 'Next page')}
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          page={useLocalPagination ? localCurrentPage : currentPage}
          pageNumberText={t('pageNumber', 'Page number')}
          pageSize={pageSize}
          pageSizes={DEFAULT_PAGE_SIZES}
          totalItems={useLocalPagination ? searchResults.length : totalCount}
          size={responsiveSize}
          onChange={({ page, pageSize: newPageSize }) => {
            if (useLocalPagination) {
              goToLocalPage(page);
              // Update parent pageSize, page doesn't matter for local pagination
              onPaginationChange({ page: 1, pageSize: newPageSize });
            } else {
              onPaginationChange({ page, pageSize: newPageSize });
            }
          }}
        />
      )}
    </div>
  );
};

export default VisitsTable;
