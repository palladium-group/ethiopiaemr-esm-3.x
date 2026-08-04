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
  Tag,
} from '@carbon/react';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDate, launchWorkspace2, parseDate, useConfig, useLayoutType } from '@openmrs/esm-framework';
import { type PatientDiagnosis, usePatientDiagnoses } from './diagnoses.resource';
import { patientDiagnosisIsMain } from './diagnosis-main.utils';
import { type VisitNoteConfig } from '../config-schema';
import styles from './diagnoses-summary.scss';
import { useActiveVisit } from '../patient-chart/visit/visits-widget/visit.resource';

interface DiagnosesSummaryProps {
  patient: fhir.Patient;
}

interface EncounterObs {
  uuid: string;
  concept: {
    uuid: string;
  };
  value?: string | number | boolean | object;
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

function getEncounterNoteText(encounterObs: Array<EncounterObs>, encounterNoteTextConceptUuid: string) {
  const noteObs = encounterObs?.find((obs) => obs?.concept?.uuid === encounterNoteTextConceptUuid);
  return typeof noteObs?.value === 'string' ? noteObs.value.trim() : '';
}

export default function DiagnosesSummary({ patient }: DiagnosesSummaryProps) {
  const { t } = useTranslation();
  const config = useConfig<VisitNoteConfig>();
  const { encounterNoteTextConceptUuid, mainDiagnosisAttributeTypeUuid } = config.visitNoteConfig;
  const { diagnoses, error, isLoading, isValidating } = usePatientDiagnoses(patient.id);
  const { activeVisit } = useActiveVisit(patient.id);
  const isTablet = useLayoutType() === 'tablet';
  const headerTitle = t('diagnoses', 'Diagnoses');
  const displayText = t('diagnosesLowercase', 'diagnoses');
  const activeEncounterUuid = React.useMemo(() => {
    if (!activeVisit?.uuid) {
      return null;
    }

    const activeVisitDiagnoses = (diagnoses ?? [])
      .filter((diagnosis) => diagnosis.visitUuid === activeVisit.uuid)
      .sort((a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime());

    return activeVisitDiagnoses[0]?.encounterUuid ?? null;
  }, [activeVisit?.uuid, diagnoses]);

  if (isLoading) {
    return (
      <div className={styles.widgetCard}>
        <DataTableSkeleton role="progressbar" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.widgetCard}>
        <ErrorState error={error} headerTitle={headerTitle} />
      </div>
    );
  }

  if (!diagnoses?.length) {
    return (
      <div className={styles.widgetCard}>
        <EmptyState displayText={displayText} headerTitle={headerTitle} />
      </div>
    );
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
    encounterObs: Array<EncounterObs>,
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
          attributes: diagnosis.attributes,
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
      <div className={styles.encounterList}>
        {Array.from(diagnosesByEncounter.entries()).map(([encounterUuid, encounterDiagnoses]) => {
          const sortedDiagnoses = encounterDiagnoses
            .slice()
            .sort((a, b) => a.rank - b.rank || (a.display ?? '').localeCompare(b.display ?? ''));
          const encounterDateTime = sortedDiagnoses[0]?.encounterDatetime;
          const encounterObs = sortedDiagnoses[0]?.encounterObs ?? [];
          const encounterProvider = sortedDiagnoses[0]?.encounterProvider ?? '--';
          const encounterLocation = sortedDiagnoses[0]?.encounterLocation ?? '--';
          const encounterNoteText = getEncounterNoteText(encounterObs, encounterNoteTextConceptUuid);
          const canEditEncounter = encounterUuid === activeEncounterUuid;

          return (
            <section key={encounterUuid} className={styles.encounterSection}>
              <header className={styles.encounterHeader}>
                <div className={styles.encounterTitleRow}>
                  <h4 className={styles.encounterDate}>
                    {encounterDateTime
                      ? formatDate(new Date(encounterDateTime), { time: true })
                      : t('encounterGroupHeaderNoDate', '--')}
                  </h4>
                  {canEditEncounter ? (
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
                  ) : null}
                </div>
                <dl className={styles.encounterDetails}>
                  <div className={styles.encounterDetail}>
                    <dt>{t('provider', 'Provider')}</dt>
                    <dd>{encounterProvider}</dd>
                  </div>
                  <div className={styles.encounterDetail}>
                    <dt>{t('location', 'Location')}</dt>
                    <dd>{encounterLocation}</dd>
                  </div>
                </dl>
                {encounterNoteText ? (
                  <p className={styles.encounterNote}>
                    <span className={styles.encounterNoteLabel}>{t('visitNote', 'Visit note')}</span>
                    {encounterNoteText}
                  </p>
                ) : null}
              </header>
              <TableContainer>
                <Table aria-label={t('diagnoses', 'Diagnoses')} className={styles.table} size={isTablet ? 'lg' : 'md'}>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t('diagnosis', 'Diagnosis')}</TableHeader>
                      <TableHeader>{t('diagnosisOrder', 'Order')}</TableHeader>
                      <TableHeader>{t('diagnosisCertainty', 'Certainty')}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDiagnoses.map((diagnosis) => {
                      const isMain = patientDiagnosisIsMain(diagnosis, mainDiagnosisAttributeTypeUuid);
                      return (
                        <TableRow key={diagnosis.id}>
                          <TableCell>
                            <div className={styles.diagnosisNameCell}>
                              {isMain ? (
                                <Tag size="sm" type="green" title={t('mainDiagnosis', 'Main diagnosis')}>
                                  {t('main', 'Main')}
                                </Tag>
                              ) : null}
                              <span>{diagnosis.display ?? '--'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getDiagnosisOrderLabel(diagnosis.rank, t)}</TableCell>
                          <TableCell>{getDiagnosisCertaintyLabel(diagnosis.certainty, t)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </section>
          );
        })}
      </div>
    </div>
  );
}
