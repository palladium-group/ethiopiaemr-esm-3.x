import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { formatDate, parseDate, useConfig, useLayoutType } from '@openmrs/esm-framework';
import { type ClinicalWorkflowConfig } from '../config-schema';
import { usePatientDiagnoses } from './diagnoses.resource';
import styles from './recent-diagnoses-table.scss';

interface CardHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, children }) => (
  <div className={styles.cardHeader}>
    <h4 className={styles.cardTitle}>{title}</h4>
    <div className={styles.cardHeaderActions}>{children}</div>
  </div>
);

interface EmptyStateProps {
  displayText: string;
  headerTitle: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ displayText, headerTitle }) => (
  <div className={styles.widgetCard}>
    <CardHeader title={headerTitle} />
    <p className={styles.emptyState}>{displayText}</p>
  </div>
);

interface ErrorStateProps {
  error: unknown;
  headerTitle: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, headerTitle }) => (
  <div className={styles.widgetCard}>
    <CardHeader title={headerTitle} />
    <p className={styles.errorState}>{error instanceof Error ? error.message : String(error)}</p>
  </div>
);

interface RecentDiagnosesWidgetProps {
  patientUuid?: string;
  patient?: fhir.Patient;
}

function getDiagnosisOrderLabel(rank: number, t: (key: string, fallback: string) => string) {
  if (rank === 1) {
    return t('primary', 'Primary');
  }
  if (rank === 2) {
    return t('secondary', 'Secondary');
  }
  return t('unknown', 'Unknown');
}

function getDiagnosisCertaintyLabel(certainty: string, t: (key: string, fallback: string) => string) {
  const certaintyValue = certainty?.toUpperCase();
  if (certaintyValue === 'PROVISIONAL' || certaintyValue === 'PRESUMED') {
    return t('presumed', 'Presumed');
  }
  if (certaintyValue === 'CONFIRMED') {
    return t('confirmed', 'Confirmed');
  }
  return certainty ? t(certainty.toLowerCase(), certainty) : '--';
}

const RecentDiagnosesWidget: React.FC<RecentDiagnosesWidgetProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const { recentDiagnosesCount } = useConfig<ClinicalWorkflowConfig>();
  const isTablet = useLayoutType() === 'tablet';

  const resolvedPatientUuid = patientUuid ?? patient?.id;
  const { diagnoses, error, isLoading, isValidating } = usePatientDiagnoses(resolvedPatientUuid);

  const headerTitle = t('recentDiagnosesWidgetTitle', 'Recent diagnoses');

  if (isLoading) {
    return (
      <div className={styles.widgetCard}>
        <CardHeader title={headerTitle} />
        <DataTableSkeleton role="progressbar" compact={!isTablet} zebra />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }

  if (!diagnoses?.length) {
    return (
      <EmptyState
        headerTitle={headerTitle}
        displayText={t('noDiagnosesFound', 'No diagnoses recorded for this patient')}
      />
    );
  }

  const visibleDiagnoses = diagnoses.slice(0, recentDiagnosesCount);

  const headers = [
    { key: 'display', header: t('diagnosis', 'Diagnosis') },
    { key: 'date', header: t('date', 'Date') },
    { key: 'order', header: t('order', 'Order') },
    { key: 'certainty', header: t('certainty', 'Certainty') },
  ];

  const rows = visibleDiagnoses.map((diagnosis) => ({
    id: diagnosis.id,
    display: diagnosis.display ?? '--',
    date: diagnosis.encounterDatetime ? formatDate(parseDate(diagnosis.encounterDatetime), { time: false }) : '--',
    order: getDiagnosisOrderLabel(diagnosis.rank, t),
    certainty: getDiagnosisCertaintyLabel(diagnosis.certainty, t),
  }));

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={headerTitle}>
        {isValidating ? <InlineLoading description={t('loading', 'Loading')} /> : null}
      </CardHeader>
      <DataTable rows={rows} headers={headers} size={isTablet ? 'lg' : 'sm'} useZebraStyles>
        {({ rows: dataRows, headers: dataHeaders, getHeaderProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label={headerTitle} className={styles.table}>
              <TableHead>
                <TableRow>
                  {dataHeaders.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dataRows.map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <div className={styles.tableFooter}>
        <span className={styles.tableFooterItemCount}>
          {t('itemCount', '{{visible}} / {{total}} {{label}}', {
            visible: visibleDiagnoses.length,
            total: visibleDiagnoses.length,
            label: diagnoses.length === 1 ? t('itemSingular', 'item') : t('itemPlural', 'items'),
          })}
        </span>
      </div>
    </div>
  );
};

export default RecentDiagnosesWidget;
