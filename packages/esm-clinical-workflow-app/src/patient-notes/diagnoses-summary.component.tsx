import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTableSkeleton,
  InlineLoading,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDate, launchWorkspace2, parseDate, useLayoutType } from '@openmrs/esm-framework';
import { type PatientDiagnosis, usePatientDiagnoses } from './diagnoses.resource';
import styles from '../patient-chart/visit/visits-widget/past-visits-components/visit-summary.scss';

interface DiagnosesSummaryProps {
  patient: fhir.Patient;
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

export default function DiagnosesSummary({ patient }: DiagnosesSummaryProps) {
  const { t } = useTranslation();
  const { diagnoses, error, isLoading, isValidating } = usePatientDiagnoses(patient.id);
  const isTablet = useLayoutType() === 'tablet';
  const headerTitle = t('diagnoses', 'Diagnoses');
  const displayText = t('diagnosesLowercase', 'diagnoses');

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }

  if (!diagnoses?.length) {
    return <EmptyState displayText={displayText} headerTitle={headerTitle} />;
  }

  const diagnosesByEncounter = diagnoses.reduce((acc, diagnosis) => {
    const existing = acc.get(diagnosis.encounterUuid);
    if (existing) {
      existing.push(diagnosis);
    } else {
      acc.set(diagnosis.encounterUuid, [diagnosis]);
    }
    return acc;
  }, new Map<string, typeof diagnoses>());

  const launchVisitNoteEditor = (
    encounterUuid: string,
    encounterDateTime: string,
    encounterDiagnoses: Array<PatientDiagnosis>,
    encounterObs: Array<{
      uuid: string;
      concept: {
        uuid: string;
      };
      value?: string | number | boolean | object;
    }>,
  ) => {
    const normalizedEncounterDate = parseDate(encounterDateTime);
    launchWorkspace2('visit-notes-form-shadow-workspace', {
      formContext: 'editing',
      encounter: {
        id: encounterUuid,
        uuid: encounterUuid,
        rawDatetime: normalizedEncounterDate.toISOString(),
        encounterDatetime: normalizedEncounterDate.toISOString(),
        diagnoses: encounterDiagnoses.map((diagnosis) => ({
          uuid: diagnosis.id,
          display: diagnosis.display,
          certainty: diagnosis.certainty,
          rank: diagnosis.rank,
          diagnosis: {
            coded: {
              uuid: diagnosis.codedUuid ?? '',
            },
          },
        })),
        obs: encounterObs ?? [],
      },
    });
  };

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={headerTitle}>
        <span>{isValidating ? <InlineLoading /> : null}</span>
      </CardHeader>
      <TableContainer>
        <Table aria-label="diagnoses summary" className={styles.table}>
          <TableHead>
            <TableRow>
              <TableHeader>{t('diagnosis', 'Diagnosis')}</TableHeader>
              <TableHeader>{t('diagnosisOrder', 'Order')}</TableHeader>
              <TableHeader>{t('diagnosisCertainty', 'Certainty')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from(diagnosesByEncounter.entries()).flatMap(([encounterUuid, encounterDiagnoses]) => {
              const sortedDiagnoses = encounterDiagnoses.slice().sort((a, b) => a.rank - b.rank);
              const encounterDateTime = sortedDiagnoses[0]?.encounterDatetime;
              const encounterObs = sortedDiagnoses[0]?.encounterObs ?? [];
              return [
                <TableRow key={`encounter-${encounterUuid}`}>
                  <TableCell colSpan={3}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}>
                      <span>
                        {encounterDateTime
                          ? formatDate(new Date(encounterDateTime), { time: true })
                          : t('encounterGroupHeaderNoDate', '--')}
                      </span>
                      <OverflowMenu
                        aria-label={t('actionsMenu', 'Actions menu')}
                        align="left"
                        size={isTablet ? 'lg' : 'sm'}
                        flipped>
                        <OverflowMenuItem
                          itemText={t('edit', 'Edit')}
                          onClick={() =>
                            launchVisitNoteEditor(encounterUuid, encounterDateTime, sortedDiagnoses, encounterObs)
                          }
                        />
                      </OverflowMenu>
                    </div>
                  </TableCell>
                </TableRow>,
                ...sortedDiagnoses.map((diagnosis) => (
                  <TableRow key={diagnosis.id}>
                    <TableCell>{diagnosis.display ?? '--'}</TableCell>
                    <TableCell>{getDiagnosisOrderLabel(diagnosis.rank, t)}</TableCell>
                    <TableCell>{getDiagnosisCertaintyLabel(diagnosis.certainty, t)}</TableCell>
                  </TableRow>
                )),
              ];
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
