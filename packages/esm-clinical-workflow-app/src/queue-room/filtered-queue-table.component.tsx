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
  TableHead,
  TableHeader,
  TableRow,
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
import styles from './filtered-queue-table.scss';

interface FilteredQueueTableProps {
  queueEntries: QueueEntry[];
  isLoading?: boolean;
  isValidating?: boolean;
}

const FilteredQueueTable: React.FC<FilteredQueueTableProps> = ({ queueEntries, isLoading, isValidating }) => {
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
  }, [goTo, queueEntries]);

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
    <div className={styles.tableWrapper}>
      {isValidating ? (
        <div className={styles.validatingRow}>
          <InlineLoading />
        </div>
      ) : null}
      <DataTable
        data-floating-menu-container
        overflowMenuOnHover={isDesktop(layout)}
        rows={rows}
        headers={headers}
        size={responsiveSize}
        useZebraStyles={headers.length > 1}>
        {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
          <>
            <TableContainer className={styles.tableContainer}>
              <Table {...getTableProps()} className={styles.queueTable}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHeader key={header.key} {...getHeaderProps({ header })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map((cell, index) => (
                        <TableCell
                          key={cell.id}
                          className={classNames({
                            'cds--table-column-menu': columnIds[index]?.includes('actions'),
                          })}>
                          {cell.value}
                        </TableCell>
                      ))}
                    </TableRow>
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
    </div>
  );
};

export function filterQueueEntriesBySearch(
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

export default FilteredQueueTable;
