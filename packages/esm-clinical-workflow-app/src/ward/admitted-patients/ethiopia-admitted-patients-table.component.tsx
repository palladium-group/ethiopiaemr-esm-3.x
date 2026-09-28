import {
  DataTable,
  DataTableSkeleton,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import {
  formatDatetime,
  launchWorkspace2,
  parseDate,
  useAppContext,
  useConfig,
  usePagination,
} from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { countInclusiveDays } from '../stay-duration.utils';
import { getOpenmrsId } from './admitted-patients.utils';
import { buildWardPatients } from './build-ward-patients';
import { EmptyState } from './empty-state.component';
import { HyperLinkPatientCell } from './patient-cells';
import type { WardAppConfigSlice, WardViewContext } from './ward.types';

const EthiopiaAdmittedPatientsTable = () => {
  const [search, setSearch] = useState('');
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const { isLoading } = wardPatientGroupDetails ?? {};
  const { t } = useTranslation();
  const config = useConfig<WardAppConfigSlice>({ externalModuleName: '@kenyaemr/esm-ward-app' });
  const headers = [
    { key: 'admissionDate', header: t('admissionDate', 'Admission Date') },
    { key: 'idNumber', header: t('idNumber', 'ID Number') },
    { key: 'name', header: t('name', 'Name') },
    { key: 'gender', header: t('gender', 'Gender') },
    { key: 'age', header: t('age', 'Age') },
    { key: 'bedNumber', header: t('bedNumber', 'Bed Number') },
    { key: 'daysAdmitted', header: t('daysInWard', 'Days in ward') },
    { key: 'action', header: t('action', 'Action') },
  ];

  const patients = useMemo(() => buildWardPatients(wardPatientGroupDetails, config), [wardPatientGroupDetails, config]);

  const [pageSize, setPageSize] = useState(5);
  const searchResults = useMemo(() => {
    const query = search.toLowerCase();
    return patients.filter((pat) => pat?.patient?.person?.display?.toLowerCase().includes(query));
  }, [patients, search]);
  const { paginated, results, totalPages, currentPage, goTo } = usePagination(searchResults, pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, totalPages, currentPage, results?.length ?? 0);
  const tableRows = useMemo(() => {
    return (results ?? []).map((patient, index) => {
      const { encounterAssigningToCurrentInpatientLocation } = patient.inpatientAdmission ?? {};

      let admissionDate = '--';
      try {
        if (encounterAssigningToCurrentInpatientLocation?.encounterDatetime) {
          admissionDate = formatDatetime(parseDate(encounterAssigningToCurrentInpatientLocation.encounterDatetime));
        }
      } catch {
        admissionDate = '--';
      }
      const daysAdmitted = countInclusiveDays(encounterAssigningToCurrentInpatientLocation?.encounterDatetime) ?? '--';

      return {
        id: patient.patient?.uuid ?? index.toString(),
        admissionDate,
        idNumber: getOpenmrsId(patient.patient?.identifiers ?? []) ?? '--',
        name: (
          <HyperLinkPatientCell patientName={patient.patient?.person?.display} patientUuid={patient.patient?.uuid} />
        ),
        gender: patient.patient?.person?.gender ?? '--',
        age: patient.patient?.person?.age ?? '--',
        bedNumber: patient.bed?.bedNumber ?? '--',
        daysAdmitted,
        action: (
          <OverflowMenu size={'sm'} flipped>
            <OverflowMenuItem
              itemText={t('interWardTransfer', 'Interward Trasfer')}
              onClick={() =>
                launchWorkspace2('patient-admit-or-transfer-request-form', {
                  workspaceTitle: 'Trasfer',
                  wardPatient: patient,
                  withContentSwitcher: false,
                  defaultTransfersection: 'transfer',
                })
              }
            />
            <OverflowMenuItem
              itemText={t('bedSwap', 'Bed Swap')}
              onClick={() =>
                launchWorkspace2('ethiopia-bed-swap-workspace', {
                  workspaceTitle: t('bedSwap', 'Bed Swap'),
                  wardPatient: patient,
                })
              }
            />
          </OverflowMenu>
        ),
      };
    });
  }, [results, t]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (!patients.length) {
    return <EmptyState message={t('noAdmittedPatientsinCurrentward', 'No admitted patients in the current ward')} />;
  }

  return (
    <div>
      <Search
        labelText={t('searchPatients', 'Search patients')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getCellProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label="sample table">
              <TableHead>
                <TableRow>
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
                  return (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} {...getCellProps({ cell })}>
                          {cell.value}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {paginated && !isLoading && (
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                pageSizes={pageSizes}
                totalItems={(searchResults ?? []).length}
                onChange={({ page, pageSize }) => {
                  goTo(page);
                  setPageSize(pageSize);
                }}
              />
            )}
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default EthiopiaAdmittedPatientsTable;
