import React, { useState, useMemo } from 'react';
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
  usePagination,
  useConfig,
  type Visit,
} from '@openmrs/esm-framework';
import styles from './visits-table.component.scss';

interface VisitsTableProps {
  visits: Array<Visit>;
  isLoading: boolean;
  tableHeading: string;
}

const VisitsTable: React.FC<VisitsTableProps> = ({ visits, isLoading, tableHeading }) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(25);
  const [searchString, setSearchString] = useState('');
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const config = useConfig();
  const customPatientChartUrl =
    config?.customPatientChartUrl || '${openmrsSpaBase}/patient/${patientUuid}/chart/Visits';

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

  const { results, goTo, currentPage } = usePagination(searchResults, pageSize);

  const headerData = [
    { header: t('patientName', 'Patient Name'), key: 'patientName' },
    { header: t('identifier', 'Identifier'), key: 'identifier' },
    { header: t('visitType', 'Visit Type'), key: 'visitType' },
    { header: t('location', 'Location'), key: 'location' },
    { header: t('startTime', 'Start Time'), key: 'startTime' },
    { header: t('endTime', 'End Time'), key: 'endTime' },
    { header: t('status', 'Status'), key: 'status' },
  ];

  const rowData = results?.map((visit) => {
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
    goTo(1);
    setSearchString(e.target.value);
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
      {searchResults.length > pageSize && (
        <Pagination
          backwardText={t('previousPage', 'Previous page')}
          forwardText={t('nextPage', 'Next page')}
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          page={currentPage}
          pageNumberText={t('pageNumber', 'Page number')}
          pageSize={pageSize}
          pageSizes={[10, 25, 50, 100]}
          totalItems={searchResults.length}
          onChange={({ page, pageSize }) => {
            setPageSize(pageSize);
            goTo(page);
          }}
        />
      )}
    </div>
  );
};

export default VisitsTable;
