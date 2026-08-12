import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Toggle,
} from '@carbon/react';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDate, useConfig } from '@openmrs/esm-framework';
import { type ClinicalWorkflowConfig } from '../config-schema';
import { buildTimeline, isEmptySummary, useLegacySummary } from './legacy-summary.resource';
import styles from './legacy-summary.scss';

interface LegacySummaryProps {
  patient: fhir.Patient;
}

export default function LegacySummary({ patient }: LegacySummaryProps) {
  const { t } = useTranslation();
  const config = useConfig<ClinicalWorkflowConfig>();
  const { data, error, isLoading } = useLegacySummary(patient.id);
  const [showTimeline, setShowTimeline] = useState(false);

  if (config.legacySummaryDisplayEnabled === false) {
    return null;
  }

  const headerTitle = t('legacySummary', 'Legacy Summary');

  if (isLoading) {
    return (
      <div className={styles.legacySummary}>
        <CardHeader title={headerTitle}>{null}</CardHeader>
        <DataTableSkeleton role="progressbar" />
      </div>
    );
  }

  if (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return (
        <div className={styles.legacySummary}>
          <EmptyState displayText={t('legacySummaryEmpty', 'legacy clinical data')} headerTitle={headerTitle} />
        </div>
      );
    }
    return (
      <div className={styles.legacySummary}>
        <ErrorState error={error} headerTitle={headerTitle} />
      </div>
    );
  }

  if (isEmptySummary(data)) {
    return (
      <div className={styles.legacySummary}>
        <EmptyState displayText={t('legacySummaryEmpty', 'legacy clinical data')} headerTitle={headerTitle} />
      </div>
    );
  }

  const timeline = buildTimeline(data!);

  return (
    <div className={styles.legacySummary}>
      <CardHeader title={headerTitle}>{null}</CardHeader>
      <div className={styles.banner} role="note">
        {t('legacySummaryBanner', 'Historical data from Bahmni — read-only')}
      </div>

      <div className={styles.viewToggle}>
        <Toggle
          id="legacy-summary-timeline-toggle"
          labelText={t('legacySummaryTimelineView', 'Timeline view')}
          toggled={showTimeline}
          onToggle={setShowTimeline}
          size="sm"
        />
      </div>

      {showTimeline ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('timeline', 'Timeline')}</h3>
          {timeline.map((entry, idx) => (
            <div key={`${entry.type}-${entry.date}-${idx}`} className={styles.timelineItem}>
              <span className={styles.timelineDate}>{formatDate(new Date(entry.date))}</span>
              <span className={styles.timelineType}>{entry.type}</span>
              <span>{entry.display}</span>
            </div>
          ))}
        </section>
      ) : (
        <>
          {data?.diagnoses?.length ? (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('diagnoses', 'Diagnoses')}</h3>
              <TableContainer>
                <Table size="md" className={styles.table}>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t('diagnosis', 'Diagnosis')}</TableHeader>
                      <TableHeader>{t('diagnosisOrder', 'Order')}</TableHeader>
                      <TableHeader>{t('diagnosisCertainty', 'Certainty')}</TableHeader>
                      <TableHeader>{t('date', 'Date')}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.diagnoses.map((d, idx) => (
                      <TableRow key={`diag-${idx}`}>
                        <TableCell>{d.display}</TableCell>
                        <TableCell>{d.order ?? '—'}</TableCell>
                        <TableCell>{d.certainty ?? '—'}</TableCell>
                        <TableCell>{formatDate(new Date(d.recordedDate))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </section>
          ) : null}

          {data?.medications?.length ? (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('medications', 'Medications')}</h3>
              <TableContainer>
                <Table size="md" className={styles.table}>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t('medication', 'Medication')}</TableHeader>
                      <TableHeader>{t('date', 'Date')}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.medications.map((m, idx) => (
                      <TableRow key={`med-${idx}`}>
                        <TableCell>{m.display}</TableCell>
                        <TableCell>{formatDate(new Date(m.orderDate))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
