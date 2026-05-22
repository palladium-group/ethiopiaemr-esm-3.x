import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from '@carbon/react';
import { formatDatetime } from '@openmrs/esm-framework';
import type { ConsultationStatus, ConsultationThread } from '../types/consultation.types';
import styles from './consultation-list.scss';

interface ConsultationListProps {
  consultations: Array<ConsultationThread>;
  onConsultationClick?: (encounterUuid: string) => void;
}

function getStatusTagType(status: ConsultationStatus): 'green' | 'gray' {
  return status === 'completed' ? 'green' : 'gray';
}

const ConsultationList: React.FC<ConsultationListProps> = ({ consultations, onConsultationClick }) => {
  const { t } = useTranslation();

  const headers = useMemo(
    () => [
      { key: 'requestedDate', header: t('requestedDate', 'Requested date') },
      { key: 'consultedDepartment', header: t('consultedDepartment', 'Consulted department') },
      { key: 'consultingDepartment', header: t('consultingDepartment', 'Consulting department') },
      { key: 'requestingProvider', header: t('requestingProvider', 'Requesting provider') },
      { key: 'consultationType', header: t('consultationType', 'Type') },
      { key: 'status', header: t('status', 'Status') },
    ],
    [t],
  );

  const getStatusLabel = (status: ConsultationStatus) => {
    if (status === 'completed') {
      return t('completed', 'Completed');
    }

    return t('pending', 'Pending');
  };

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
          {consultations.map((consultation) => (
            <TableRow
              key={consultation.encounterUuid}
              className={onConsultationClick ? styles.clickableRow : undefined}
              onClick={onConsultationClick ? () => onConsultationClick(consultation.encounterUuid) : undefined}>
              <TableCell>
                {consultation.requestedAt ? formatDatetime(new Date(consultation.requestedAt)) : '--'}
              </TableCell>
              <TableCell>{consultation.consultedDepartment.display || '--'}</TableCell>
              <TableCell>{consultation.consultingDepartment || '--'}</TableCell>
              <TableCell>{consultation.requestingProvider?.display || '--'}</TableCell>
              <TableCell>{consultation.consultationType || '--'}</TableCell>
              <TableCell>
                <Tag type={getStatusTagType(consultation.status)} size="sm">
                  {getStatusLabel(consultation.status)}
                </Tag>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ConsultationList;
