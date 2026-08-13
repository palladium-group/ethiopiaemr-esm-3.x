import {
  DataTable,
  DataTableSkeleton,
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
} from '@carbon/react';
import { ErrorState, formatDatetime, parseDate, useAppContext, usePagination } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getOpenmrsId } from '../admitted-patients/admitted-patients.utils';
import { EmptyState } from '../admitted-patients/empty-state.component';
import { HyperLinkPatientCell } from '../admitted-patients/patient-cells';
import type { InpatientRequest, WardViewContext } from '../admitted-patients/ward.types';
import AwaitingAdmissionExpandedRow from './awaiting-admission-expanded-row.component';
import WardAdmissionRequestActions from './ward-admission-request-actions.component';
import styles from './ethiopia-awaiting-admission-patients-table.scss';

const EthiopiaAwaitingAdmissionPatientsTable = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const { inpatientRequests, isLoading, error } = wardPatientGroupDetails?.inpatientRequestResponse ?? {};
  const [pageSize, setPageSize] = useState(5);

  const headers = [
    { key: 'admissionDate', header: t('dateQueued', 'Date Queued') },
    { key: 'idNumber', header: t('idNumber', 'ID Number') },
    { key: 'name', header: t('name', 'Name') },
    { key: 'gender', header: t('gender', 'Gender') },
    { key: 'age', header: t('age', 'Age') },
    { key: 'bedNumber', header: t('bedNumber', 'Bed Number') },
    { key: 'daysAdmitted', header: t('durationOnWard', 'Duration on ward') },
    { key: 'action', header: t('action', 'Action') },
  ];

  const searchResults = useMemo(() => {
    return inpatientRequests?.filter((request) =>
      request?.patient?.person?.display?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [inpatientRequests, search]);

  const { paginated, results, totalPages, currentPage, goTo } = usePagination(searchResults ?? [], pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, totalPages, currentPage, results.length);

  const requestsByRowId = useMemo(() => {
    const map = new Map<string, InpatientRequest>();
    results.forEach((request, index) => {
      map.set(request.patient?.uuid ?? index.toString(), request);
    });
    return map;
  }, [results]);

  const tableRows = useMemo(() => {
    return results.map((request, index) => {
      const admissionDate = request.dispositionEncounter?.encounterDatetime
        ? formatDatetime(parseDate(request.dispositionEncounter.encounterDatetime))
        : '--';
      const encounterDate = request.dispositionEncounter?.encounterDatetime;
      const daysInQueue =
        encounterDate && dayjs(encounterDate).isValid()
          ? Math.abs(dayjs().startOf('day').diff(dayjs(encounterDate).startOf('day'), 'days'))
          : '--';
      const rowId = request.patient?.uuid ?? index.toString();

      return {
        id: rowId,
        admissionDate,
        idNumber: getOpenmrsId(request.patient?.identifiers ?? []) ?? '--',
        name: (
          <HyperLinkPatientCell patientName={request.patient?.person?.display} patientUuid={request.patient?.uuid} />
        ),
        gender: request.patient?.person?.gender ?? '--',
        age: request.patient?.person?.age ?? '--',
        bedNumber: '--',
        daysAdmitted: daysInQueue,
        action: <WardAdmissionRequestActions request={request} />,
      };
    });
  }, [results]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('awaitingAdmission', 'Awaiting Admission')} />;
  }

  if (!inpatientRequests?.length) {
    return <EmptyState message={t('noPatientInAdmissionQueue', 'No patients in admission queue')} />;
  }

  return (
    <div className={styles.container}>
      <Search
        className={styles.search}
        labelText={t('searchPatients', 'Search patients')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getExpandHeaderProps, getExpandedRowProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label={t('awaitingAdmission', 'Awaiting Admission')}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                  {headers.map((header) => (
                    <TableHeader
                      key={header.key}
                      {...getHeaderProps({
                        header,
                      })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const request = requestsByRowId.get(row.id);

                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow {...getRowProps({ row })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableExpandRow>
                      {row.isExpanded && request ? (
                        <TableExpandedRow
                          className={styles.expandedActiveVisitRow}
                          {...getExpandedRowProps({ row })}
                          colSpan={headers.length + 1}>
                          <AwaitingAdmissionExpandedRow request={request} />
                        </TableExpandedRow>
                      ) : (
                        <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 1} />
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            {paginated && !isLoading && (
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                pageSizes={pageSizes}
                totalItems={searchResults?.length ?? 0}
                onChange={({ page, pageSize: nextPageSize }) => {
                  goTo(page);
                  setPageSize(nextPageSize);
                }}
              />
            )}
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default EthiopiaAwaitingAdmissionPatientsTable;
