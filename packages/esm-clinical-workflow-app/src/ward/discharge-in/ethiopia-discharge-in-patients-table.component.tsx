import {
  DataTable,
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
import { formatDatetime, parseDate, useAppContext, useConfig, usePagination } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import { getOpenmrsId, bedLayoutToBed } from '../admitted-patients/admitted-patients.utils';
import { EmptyState } from '../admitted-patients/empty-state.component';
import { HyperLinkPatientCell } from '../admitted-patients/patient-cells';
import type { WardPatient, WardViewContext } from '../admitted-patients/ward.types';
import { useEmrConfiguration } from '../bed-swap/useEmrConfiguration';
import {
  NurseDischargeConfirmationStatus,
  PatientBillStatus,
  UnAssignPatientBedAction,
} from './discharge-in-cells.component';
import { usePatientLeaveBed } from './patient-leave-bed.resource';

const EthiopiaDischargeInPatientsTable = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { wardPatientGroupDetails } = useAppContext<WardViewContext>('ward-view-context') ?? {};
  const { bedLayouts, wardAdmittedPatientsWithBed, isLoading } = wardPatientGroupDetails ?? {};
  const { emrConfiguration, isLoadingEmrConfiguration } = useEmrConfiguration();
  const { handleLeaveBed } = usePatientLeaveBed();
  const config = useConfig<ClinicalWorkflowConfig>();

  const headers = [
    { key: 'admissionDate', header: t('admissionDate', 'Admission Date') },
    { key: 'idNumber', header: t('idNumber', 'ID Number') },
    { key: 'name', header: t('name', 'Name') },
    { key: 'gender', header: t('gender', 'Gender') },
    { key: 'age', header: t('age', 'Age') },
    { key: 'bedNumber', header: t('bedNumber', 'Bed Number') },
    { key: 'daysAdmitted', header: t('durationOnWard', 'Duration on Ward') },
    { key: 'billStatus', header: t('billStatus', 'Bill Status') },
    { key: 'nurseConfirmation', header: t('nurseConfirmation', 'Nurse confirmation') },
    { key: 'action', header: t('action', 'Action') },
  ];

  const patients = useMemo(() => {
    return (
      bedLayouts
        ?.map((bedLayout) => {
          const bed = bedLayoutToBed(bedLayout);
          const wardPatients: WardPatient[] = bedLayout.patients.map((patient): WardPatient => {
            const inpatientAdmission = wardAdmittedPatientsWithBed?.get(patient.uuid);
            if (inpatientAdmission) {
              const { patient: admittedPatient, visit, currentInpatientRequest } = inpatientAdmission;
              return {
                patient: admittedPatient,
                visit,
                bed,
                inpatientAdmission,
                inpatientRequest: currentInpatientRequest || null,
              };
            }

            return {
              patient,
              visit: null,
              bed,
              inpatientAdmission: null,
              inpatientRequest: null,
            };
          });
          return wardPatients;
        })
        ?.flat() ?? []
    ).filter((patient) =>
      patient?.visit?.encounters?.some(
        (encounter) => encounter.encounterType?.uuid === config.ipdDischargeEncounterTypeUuid,
      ),
    );
  }, [bedLayouts, config.ipdDischargeEncounterTypeUuid, wardAdmittedPatientsWithBed]);

  const [pageSize, setPageSize] = useState(5);
  const searchResults = useMemo(() => {
    return patients?.filter((patient) =>
      patient?.patient?.person?.display?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [patients, search]);
  const { paginated, results, totalPages, currentPage, goTo } = usePagination(searchResults, pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, totalPages, currentPage, results.length);

  const tableRows = useMemo(() => {
    return results.map((patient, index) => {
      const { encounterAssigningToCurrentInpatientLocation, visit } = patient.inpatientAdmission ?? {};
      const admissionDate = encounterAssigningToCurrentInpatientLocation?.encounterDatetime
        ? formatDatetime(parseDate(encounterAssigningToCurrentInpatientLocation.encounterDatetime))
        : '--';
      const daysAdmitted = encounterAssigningToCurrentInpatientLocation?.encounterDatetime
        ? Math.abs(
            dayjs(encounterAssigningToCurrentInpatientLocation.encounterDatetime)
              .startOf('day')
              .diff(dayjs().startOf('day'), 'days'),
          ) + 1
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
        billStatus: (
          <PatientBillStatus
            patientUuid={patient.patient.uuid}
            encounterDatetime={encounterAssigningToCurrentInpatientLocation?.encounterDatetime}
            visit={visit}
          />
        ),
        nurseConfirmation: <NurseDischargeConfirmationStatus visit={visit} />,
        action: (
          <OverflowMenu size="sm" flipped>
            <OverflowMenuItem itemText={t('goToBilling', 'Go to Billing')} onClick={() => {}} />
            <UnAssignPatientBedAction
              patientUuid={patient.patient.uuid}
              encounterDatetime={encounterAssigningToCurrentInpatientLocation?.encounterDatetime}
              visit={visit}
              loading={isLoading || isLoadingEmrConfiguration}
              onClick={async () => {
                if (!patient.visit || !emrConfiguration?.exitFromInpatientEncounterType) {
                  return;
                }
                await handleLeaveBed(patient, emrConfiguration as unknown as Record<string, unknown>, patient.visit);
              }}
            />
          </OverflowMenu>
        ),
      };
    });
  }, [emrConfiguration, handleLeaveBed, isLoading, isLoadingEmrConfiguration, results, t]);

  if (!patients.length) {
    return <EmptyState message={t('noDischargeInpatients', 'No Discharge in patients')} />;
  }

  return (
    <div>
      <Search
        labelText={t('searchInpatients', 'Search inpatients')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getCellProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label={t('dischargeInPatients', 'Discharge in patients')}>
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
                      <TableCell key={cell.id} {...getCellProps({ cell })}>
                        {cell.value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {paginated && !isLoading && (
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                pageSizes={pageSizes}
                totalItems={(searchResults ?? []).length}
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

export default EthiopiaDischargeInPatientsTable;
