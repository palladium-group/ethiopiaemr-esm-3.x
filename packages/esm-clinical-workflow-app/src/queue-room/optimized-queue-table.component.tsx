import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  Tile,
} from '@carbon/react';
import { isDesktop, useConfig, useLayoutType, usePagination } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import {
  FilteredQueueTableCell,
  getColumnHeader,
  getQueueEntrySearchValue,
  useFilteredQueueTableColumnIds,
} from './filtered-queue-table-cells';
import OptimizedQueueTableExpandedRow from './optimized-queue-table-expanded-row.component';
import styles from './optimized-queue-table.scss';

interface OptimizedQueueTableProps {
  queueEntries: QueueEntry[];
  isLoading?: boolean;
  isValidating?: boolean;
  tableFilters?: React.ReactNode;
  /** Changes when filters/search change — used to reset pagination without reacting to SWR revalidations. */
  paginationResetKey?: string;
}

export function filterOptimizedQueueEntriesBySearch(
  queueEntries: QueueEntry[],
  searchTerm: string,
  columnIds: string[],
  visitQueueNumberAttributeUuid?: string,
): QueueEntry[] {
  const searchTermLowercase = searchTerm.toLowerCase();
  if (!searchTermLowercase) {
    return queueEntries;
  }

  return queueEntries.filter((queueEntry) =>
    columnIds.some((columnId) => {
      const value = getQueueEntrySearchValue(queueEntry, columnId, visitQueueNumberAttributeUuid);
      return value?.toLocaleLowerCase().includes(searchTermLowercase);
    }),
  );
}

const OptimizedQueueTable: React.FC<OptimizedQueueTableProps> = ({
  queueEntries,
  isLoading,
  isValidating,
  tableFilters,
  paginationResetKey,
}) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const [currentPageSize, setPageSize] = useState(10);
  const pageSizes = [10, 20, 30, 40, 50];
  const columnIds = useFilteredQueueTableColumnIds();
  const config = useConfig({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  const { goTo, results: paginatedQueueEntries, currentPage, paginated } = usePagination(queueEntries, currentPageSize);
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

  const headers = useMemo(
    () =>
      columnIds.map((columnId) => ({
        key: columnId,
        header: getColumnHeader(columnId, config),
      })),
    [columnIds, config],
  );

  useEffect(() => {
    goTo(1);
  }, [goTo, paginationResetKey]);

  const rows = useMemo(
    () =>
      paginatedQueueEntries.map((queueEntry) => {
        const row: { id: string; [key: string]: React.ReactNode } = { id: queueEntry.uuid };
        columnIds.forEach((columnId) => {
          row[columnId] = <FilteredQueueTableCell key={columnId} columnId={columnId} queueEntry={queueEntry} />;
        });
        return row;
      }),
    [columnIds, paginatedQueueEntries],
  );

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (columnIds.length === 0) {
    return <p>{t('noColumnsDefined', 'No table columns defined. Check Configuration')}</p>;
  }

  return (
    <DataTable
      data-floating-menu-container
      overflowMenuOnHover={isDesktop(layout)}
      rows={rows}
      headers={headers}
      size={responsiveSize}
      useZebraStyles={headers.length > 1}>
      {({
        rows: tableRows,
        headers: tableHeaders,
        getTableProps,
        getHeaderProps,
        getRowProps,
        getToolbarProps,
        getExpandHeaderProps,
      }) => (
        <>
          <TableContainer className={styles.tableContainer}>
            <div className={styles.toolbarContainer}>
              {isValidating ? (
                <div className={styles.loaderContainer}>
                  <InlineLoading description={t('loadingMorePatients', 'Loading more patients...')} />
                </div>
              ) : null}
              {tableFilters ? (
                <TableToolbar {...getToolbarProps()}>
                  <TableToolbarContent className={styles.toolbarContent}>{tableFilters}</TableToolbarContent>
                </TableToolbar>
              ) : null}
            </div>
            <Table {...getTableProps()} className={styles.queueTable}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                  {tableHeaders.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row, index) => (
                  <React.Fragment key={row.id}>
                    <TableExpandRow {...getRowProps({ row })}>
                      {row.cells.map((cell, cellIndex) => (
                        <TableCell
                          key={cell.id}
                          onClick={(event) => {
                            if (columnIds[cellIndex]?.includes('actions')) {
                              event.stopPropagation();
                            }
                          }}
                          className={classNames({
                            'cds--table-column-menu': columnIds[cellIndex]?.includes('actions'),
                          })}>
                          {cell.value}
                        </TableCell>
                      ))}
                    </TableExpandRow>
                    {row.isExpanded ? (
                      <TableExpandedRow className={styles.expandedActiveVisitRow} colSpan={tableHeaders.length + 2}>
                        <OptimizedQueueTableExpandedRow queueEntry={paginatedQueueEntries[index]} />
                      </TableExpandedRow>
                    ) : (
                      <TableExpandedRow className={styles.hiddenRow} colSpan={tableHeaders.length + 2} />
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {tableRows.length === 0 && (
            <div className={styles.tileContainer}>
              <Tile className={styles.tile}>
                <div className={styles.tileContent}>
                  <p className={styles.content}>{t('noPatientsToDisplay', 'No patients to display')}</p>
                  <p className={styles.helper}>{t('checkFilters', 'Check the filters above')}</p>
                </div>
              </Tile>
            </div>
          )}
          {paginated && (
            <Pagination
              forwardText={t('nextPage', 'Next page')}
              backwardText={t('previousPage', 'Previous page')}
              page={currentPage}
              pageSize={currentPageSize}
              pageSizes={pageSizes}
              totalItems={queueEntries.length}
              onChange={({ pageSize, page }) => {
                if (pageSize !== currentPageSize) {
                  setPageSize(pageSize);
                }
                if (page !== currentPage) {
                  goTo(page);
                }
              }}
            />
          )}
        </>
      )}
    </DataTable>
  );
};

export default OptimizedQueueTable;
