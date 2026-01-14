import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import {
  DataTable,
  type DataTableCell,
  type DataTableSortState,
  Table,
  TableCell,
  TableContainer,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
} from '@carbon/react';
import orderBy from 'lodash-es/orderBy';
import { formatDate, formatTime, parseDate, useLayoutType, usePagination } from '@openmrs/esm-framework';
import { PatientChartPagination } from '@openmrs/esm-patient-common-lib';
import type { TransferNote } from './transfer-notes.resource';
import styles from './transfer-notes-overview.scss';

interface TransferNotesTableProps {
  notes: Array<TransferNote>;
  pageSize: number;
  pageUrl: string;
  urlLabel: string;
}

const TransferNotesTable: React.FC<TransferNotesTableProps> = ({ notes, pageSize, pageUrl, urlLabel }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';

  const [sortParams, setSortParams] = useState({ key: '', order: 'none' });

  const tableHeaders = [
    {
      key: 'encounterDate',
      header: t('date', 'Date'),
    },
    {
      key: 'fromLocation',
      header: t('fromLocation', 'From Location'),
    },
  ];

  const sortDate = (myArray: Array<TransferNote>, order: string) => {
    const sortOrder: 'asc' | 'desc' = order === 'DESC' ? 'desc' : 'asc';
    return orderBy(myArray, [(note: TransferNote) => new Date(parseDate(note.encounterDate)).getTime()], [sortOrder]);
  };

  const sortString = (myArray: Array<TransferNote>, order: string, key: string) => {
    const sortOrder: 'asc' | 'desc' = order === 'DESC' ? 'desc' : 'asc';
    return orderBy(myArray, [(note: TransferNote) => (note as any)[key]?.toLowerCase() || ''], [sortOrder]);
  };

  const sortRows = (
    cellA: any,
    cellB: any,
    {
      sortDirection,
      sortStates,
      key,
    }: {
      sortDirection: string;
      sortStates: any;
      key: string;
      locale: string;
    },
  ) => {
    const sortKey = Object.keys(sortStates).find((k) => sortStates[k] === sortDirection);
    setSortParams({ key: sortKey ?? key, order: sortDirection });
    return 0;
  };

  const sortData = (data: Array<TransferNote>): Array<TransferNote> => {
    if (!sortParams.key || sortParams.order === 'none') {
      return data;
    }

    const { key, order } = sortParams;
    let sortedData = [];

    if (key === 'encounterDate') {
      sortedData = sortDate(data, order);
    } else if (key === 'fromLocation') {
      sortedData = sortString(data, order, 'fromLocation');
    } else {
      sortedData = data;
    }

    return sortedData;
  };

  const { results: paginatedNotes, goTo, currentPage } = usePagination(sortData(notes), pageSize);

  const tableRows = React.useMemo(() => {
    return paginatedNotes.map((note) => ({
      ...note,
      id: note.id,
      encounterDate: formatDate(new Date(note.encounterDate), { mode: 'wide' }),
      fromLocation: note.fromLocation,
      observations: note.observations, // Include all observations for dynamic display
    }));
  }, [paginatedNotes]);

  return (
    <div>
      <DataTable
        rows={tableRows}
        headers={tableHeaders}
        isSortable
        size={isTablet ? 'lg' : 'sm'}
        useZebraStyles
        sortRow={sortRows}>
        {({
          getExpandedRowProps,
          getExpandHeaderProps,
          getHeaderProps,
          getRowProps,
          getTableContainerProps,
          getTableProps,
          headers,
          rows,
        }) => (
          <TableContainer className={styles.tableContainer} {...getTableContainerProps()}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                  {headers.map((header, i) => (
                    <TableHeader
                      key={i}
                      {...getHeaderProps({
                        header,
                      })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    <TableExpandRow {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableExpandRow>
                    {row.isExpanded ? (
                      <TableExpandedRow
                        className={styles.expandedRow}
                        colSpan={headers.length + 1}
                        {...getExpandedRowProps({ row })}>
                        <div className={styles.container} key={i}>
                          {tableRows?.[i]?.observations && tableRows[i].observations.length > 0 ? (
                            <div className={styles.copy}>
                              {tableRows[i].observations.map((obs, obsIndex) => (
                                <div key={obsIndex} className={styles.observationRow}>
                                  <div className={styles.observationLabel}>{obs.conceptName}:</div>
                                  <div className={styles.observationValue}>{obs.value}</div>
                                </div>
                              ))}
                              <span className={styles.metadata}>
                                {formatTime(new Date(tableRows?.[i]?.encounterDate))} &middot;{' '}
                                {tableRows?.[i]?.encounterProvider}
                                {tableRows?.[i]?.encounterProviderRole
                                  ? `, ${tableRows?.[i]?.encounterProviderRole}`
                                  : ''}
                              </span>
                            </div>
                          ) : (
                            <span className={styles.copy}>
                              {t('noTransferDataToDisplay', 'No transfer data to display')}
                            </span>
                          )}
                        </div>
                      </TableExpandedRow>
                    ) : (
                      <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <PatientChartPagination
        pageNumber={currentPage}
        totalItems={notes.length}
        currentItems={paginatedNotes.length}
        pageSize={pageSize}
        onPageNumberChange={({ page }) => goTo(page)}
        dashboardLinkUrl={pageUrl}
        dashboardLinkLabel={urlLabel}
      />
    </div>
  );
};

export default TransferNotesTable;
