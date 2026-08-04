import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { formatDatetime } from '@openmrs/esm-framework';
import { HyperLinkPatientCell } from './patient-cell';
import { useElectiveSurgeryScheduleActions } from './elective-surgery-schedule-actions.hook';
import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';
import { getPatientIdentifier } from '../utils/patient-identifiers.utils';
import {
  getAnesthesiaStatusDisplay,
  getContactOutcomeDisplay,
  getDaysLeftTagType,
  getScheduleStatusDisplay,
  translateStatusDisplay,
} from '../utils/schedule-status.utils';
import styles from '../homepage/elective-surgery-schedule-dashboard.scss';

interface ElectiveSurgeryScheduleTableProps {
  schedules: Array<ElectiveSurgeryScheduleItem>;
  onActionComplete: () => void;
}

const ElectiveSurgeryScheduleTable: React.FC<ElectiveSurgeryScheduleTableProps> = ({ schedules, onActionComplete }) => {
  const { t } = useTranslation();
  const {
    canManageSchedule,
    canRecordContact,
    canRemovePatient,
    viewAdmissionRequest,
    recordContactOutcome,
    markReady,
    returnFromAdmission,
    removePatient,
  } = useElectiveSurgeryScheduleActions(onActionComplete);

  const headers = useMemo(
    () => [
      { key: 'patient', header: t('patient', 'Patient') },
      { key: 'identifier', header: t('healthIdMrn', 'Health ID / MRN') },
      { key: 'requestDate', header: t('requestDate', 'Request date') },
      { key: 'category', header: t('category', 'Category') },
      { key: 'daysLeft', header: t('daysLeft', 'Days left') },
      { key: 'anesthesiaStatus', header: t('anesthesiaStatus', 'Anesthesia status') },
      { key: 'scheduleStatus', header: t('scheduleStatus', 'Schedule status') },
      { key: 'lastContactOutcome', header: t('lastContactOutcome', 'Last contact outcome') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      schedules.map((item) => {
        const scheduleStatus = getScheduleStatusDisplay(item.scheduleStatus);
        const anesthesiaStatus = getAnesthesiaStatusDisplay(item.anesthesiaStatus);
        const contactOutcome = getContactOutcomeDisplay(item.lastContactOutcome);
        const daysLeftTagType = getDaysLeftTagType(item.daysLeft);

        return {
          id: item.uuid,
          patient: <HyperLinkPatientCell patientUuid={item.patient.uuid} patientName={item.patient.display || '--'} />,
          identifier: getPatientIdentifier(item),
          requestDate: item.requestDate ? formatDatetime(new Date(item.requestDate)) : '--',
          category: item.currentCategory,
          daysLeft: (
            <Tag type={daysLeftTagType} size="sm">
              {item.daysLeft}
            </Tag>
          ),
          anesthesiaStatus: (
            <Tag type={anesthesiaStatus.tagType ?? 'gray'} size="sm">
              {translateStatusDisplay(t, anesthesiaStatus)}
            </Tag>
          ),
          scheduleStatus: (
            <Tag type={scheduleStatus.tagType ?? 'gray'} size="sm">
              {translateStatusDisplay(t, scheduleStatus)}
            </Tag>
          ),
          lastContactOutcome: (
            <Tag type={contactOutcome.tagType ?? 'gray'} size="sm">
              {translateStatusDisplay(t, contactOutcome)}
            </Tag>
          ),
          actions: (
            <OverflowMenu aria-label={t('actions', 'Actions')} size="sm" flipped>
              <OverflowMenuItem
                itemText={t('viewAdmissionRequest', 'View admission request')}
                onClick={() => viewAdmissionRequest(item)}
              />
              {canRecordContact ? (
                <OverflowMenuItem
                  itemText={t('recordContactOutcome', 'Record contact outcome')}
                  onClick={() => recordContactOutcome(item)}
                />
              ) : null}
              {canManageSchedule ? (
                <OverflowMenuItem
                  itemText={t('markReadyToAdmit', 'Mark ready to admit (2nd eval not needed)')}
                  onClick={() => markReady(item)}
                />
              ) : null}
              {canManageSchedule ? (
                <OverflowMenuItem
                  itemText={t('returnFromAdmission', 'Return from admission')}
                  onClick={() => returnFromAdmission(item)}
                />
              ) : null}
              {canRemovePatient ? (
                <OverflowMenuItem
                  itemText={t('removePatient', 'Remove patient')}
                  hasDivider
                  isDelete
                  onClick={() => removePatient(item)}
                />
              ) : null}
            </OverflowMenu>
          ),
        };
      }),
    [
      canManageSchedule,
      canRecordContact,
      canRemovePatient,
      markReady,
      recordContactOutcome,
      removePatient,
      returnFromAdmission,
      schedules,
      t,
      viewAdmissionRequest,
    ],
  );

  return (
    <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
      {({ rows: tableRows, headers: tableHeaders, getHeaderProps, getRowProps, getTableProps, getCellProps }) => (
        <TableContainer className={styles.tableContainer}>
          <Table {...getTableProps()} aria-label={t('electiveSurgeryScheduleTable', 'Elective surgery schedule table')}>
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
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id} {...getCellProps({ cell })}>
                      {cell.value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
};

export default ElectiveSurgeryScheduleTable;
