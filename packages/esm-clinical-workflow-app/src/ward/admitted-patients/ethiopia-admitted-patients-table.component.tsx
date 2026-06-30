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
  userHasAccess,
  useSession,
} from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getOpenmrsId } from './admitted-patients.utils';
import { buildWardPatients } from './build-ward-patients';
import { EmptyState } from './empty-state.component';
import { HyperLinkPatientCell } from './patient-cells';
import type { WardAppConfigSlice, WardViewContext } from './ward.types';

const WARD_DASHBOARD_PRIVILEGE = 'o3: View Ward Dashboard';

const EthiopiaAdmittedPatientsTable = () => {
  const [search, setSearch] = useState('');
  const session = useSession();
  const canExchangeBeds = userHasAccess(WARD_DASHBOARD_PRIVILEGE, session?.user);
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
    { key: 'daysAdmitted', header: t('daysInWard', 'Days In Ward') },
    { key: 'action', header: t('action', 'Action') },
  ];

  const patients = useMemo(() => buildWardPatients(wardPatientGroupDetails, config), [wardPatientGroupDetails, config]);

  const [pageSize, setPageSize] = useState(5);
  const searchResults = useMemo(() => {
    return patients?.filter((pat) => pat?.patient?.person?.display?.toLowerCase().includes(search.toLowerCase()));
  }, [patients, search]);
  const { paginated, results, totalPages, currentPage, goTo } = usePagination(searchResults, pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, totalPages, currentPage, results.length);
  const tableRows = useMemo(() => {
    return results.map((patient, index) => {
      const { encounterAssigningToCurrentInpatientLocation } = patient.inpatientAdmission ?? {};

      const admissionDate = encounterAssigningToCurrentInpatientLocation?.encounterDatetime
        ? formatDatetime(parseDate(encounterAssigningToCurrentInpatientLocation.encounterDatetime))
        : '--';
      const encounterDate = encounterAssigningToCurrentInpatientLocation?.encounterDatetime;
      const daysAdmitted =
        encounterDate && dayjs(encounterDate).isValid()
          ? Math.abs(dayjs().startOf('day').diff(dayjs(encounterDate).startOf('day'), 'days'))
          : '--';

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
                launchWorkspace2('patient-bed-swap-form', {
                  workspaceTitle: 'Bed Swap',
                  wardPatient: patient,
                  withContentSwitcher: false,
                  defaultTransfersection: 'bed-swap',
                })
              }
            />
            {canExchangeBeds && patient.visit ? (
              <OverflowMenuItem
                itemText={t('exchangeBeds', 'Exchange beds')}
                onClick={() =>
                  launchWorkspace2('ethiopia-bed-exchange-workspace', {
                    workspaceTitle: t('exchangeBeds', 'Exchange beds'),
                    wardPatient: patient,
                  })
                }
              />
            ) : null}
            <OverflowMenuItem
              itemText={t('discharge', 'Discharge')}
              onClick={() => {
                launchWorkspace2('patient-discharge-workspace', {
                  wardPatient: patient,
                  patientUuid: patient.patient.uuid,
                  formUuid: config.inpatientDischargeFormUuid,
                  dischargePatientOnSuccesfullSubmission: false,
                });
              }}
            />
          </OverflowMenu>
        ),
      };
    });
  }, [results, config, t, canExchangeBeds]);

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
                totalItems={(patients ?? []).length}
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
