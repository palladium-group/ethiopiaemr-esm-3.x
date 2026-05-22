import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
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
import type { ConsultationThread } from '../types/consultation.types';
import styles from './consultation-inbox-list.scss';

interface ConsultationInboxListProps {
  consultations: Array<ConsultationThread>;
  respondingEncounterUuid?: string | null;
  onRespond?: (consultation: ConsultationThread) => void;
}

const ConsultationInboxList: React.FC<ConsultationInboxListProps> = ({
  consultations,
  respondingEncounterUuid,
  onRespond,
}) => {
  const { t } = useTranslation();

  const headers = useMemo(
    () => [
      { key: 'patient', header: t('patient', 'Patient') },
      { key: 'consultingDepartment', header: t('consultingDepartment', 'Consulting department') },
      { key: 'requestingProvider', header: t('requestingProvider', 'Requesting provider') },
      { key: 'consultationType', header: t('consultationType', 'Type') },
      { key: 'requestedDate', header: t('requestedDate', 'Requested date') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  return (
    <TableContainer className={styles.tableContainer}>
      <Table size="sm" useZebraStyles>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableHeader key={header.key}>{header.header}</TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {consultations.map((consultation) => {
            const isResponding = respondingEncounterUuid === consultation.encounterUuid;

            return (
              <TableRow key={consultation.encounterUuid}>
                <TableCell>{consultation.patientDisplay || '--'}</TableCell>
                <TableCell>{consultation.consultingDepartment || '--'}</TableCell>
                <TableCell>{consultation.requestingProvider?.display || '--'}</TableCell>
                <TableCell>{consultation.consultationType || '--'}</TableCell>
                <TableCell>
                  {consultation.requestedAt ? formatDatetime(new Date(consultation.requestedAt)) : '--'}
                </TableCell>
                <TableCell>
                  <Tag type="gray" size="sm">
                    {t('pending', 'Pending')}
                  </Tag>
                </TableCell>
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={Boolean(respondingEncounterUuid)}
                    onClick={() => onRespond?.(consultation)}>
                    {isResponding ? t('loading', 'Loading...') : t('respond', 'Respond')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ConsultationInboxList;
