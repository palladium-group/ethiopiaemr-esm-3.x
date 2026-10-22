import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import { type ShrRecord, type ShrSectionKey } from './shr-summary';
import styles from './shr-dashboard.scss';

interface ShrSectionCardProps {
  section: ShrSectionKey;
  records: Array<ShrRecord>;
}

const ShrSectionCard: React.FC<ShrSectionCardProps> = ({ section, records }) => {
  const { t } = useTranslation();
  const title = {
    problems: t('problems', 'Problems'),
    allergies: t('allergies', 'Allergies'),
    medications: t('medications', 'Medications'),
  }[section];

  return (
    <Tile className={styles.card}>
      <h5 className={styles.cardTitle}>
        {title} <span className={styles.count}>({records.length})</span>
      </h5>
      {records.length === 0 ? (
        // The SHR returns a withheld section and an empty one alike, so this must not claim either.
        <p className={styles.empty}>{t('nothingShared', 'Nothing shared')}</p>
      ) : (
        <Table size="sm" useZebraStyles aria-label={title}>
          <TableHead>
            <TableRow>
              <TableHeader>{t('name', 'Name')}</TableHeader>
              <TableHeader>{t('date', 'Date')}</TableHeader>
              <TableHeader>{t('details', 'Details')}</TableHeader>
              <TableHeader>{t('sharedBy', 'Shared by')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.name ?? t('unnamedRecord', 'Unnamed record')}</TableCell>
                <TableCell>{record.date ? formatDate(parseDate(record.date), { time: false }) : '—'}</TableCell>
                <TableCell>{[record.status, record.detail].filter(Boolean).join(' · ') || '—'}</TableCell>
                <TableCell>{record.facility ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Tile>
  );
};

export default ShrSectionCard;
