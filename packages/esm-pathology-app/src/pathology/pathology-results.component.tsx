import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandRow,
} from '@carbon/react';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDatetime, parseDate, useConfig, useLayoutType } from '@openmrs/esm-framework';
import { type PathologyConfig } from '../config-schema';
import {
  type PathologyResultObservation,
  usePathologyResultObservations,
  useResultConceptSetMembers,
} from './pathology-results.resource';
import styles from './pathology-orders.scss';

interface PathologyResultsProps {
  patient?: fhir.Patient;
  patientUuid?: string;
}

const ExpandDefaultRow: React.FC<{ expandRow: (rowId: string) => void; rowId?: string }> = ({ expandRow, rowId }) => {
  const expandedRowId = useRef<string | null>(null);

  useEffect(() => {
    // Carbon's expandRow toggles; only expand once per target so the most-recent row stays open.
    if (rowId && expandedRowId.current !== rowId) {
      expandRow(rowId);
      expandedRowId.current = rowId;
    }
  }, [expandRow, rowId]);

  return null;
};

const ResultObservations: React.FC<{ observations: Array<PathologyResultObservation> }> = ({ observations }) => {
  const { t } = useTranslation();

  if (!observations?.length) {
    return (
      <div className={styles.observation}>
        <p>{t('noObservationsFound', 'No observations found')}</p>
      </div>
    );
  }

  return (
    <div className={styles.observation}>
      {observations.map((observation) => (
        <React.Fragment key={observation.id}>
          <span>{observation.field}</span>
          <span>{observation.value}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

const PathologyResults: React.FC<PathologyResultsProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { pathologyResultConceptSetUuid, cytologyResultConceptSetUuid } = useConfig<PathologyConfig>();
  const resolvedPatientUuid = patientUuid ?? patient?.id;
  const {
    members,
    error: conceptSetError,
    isLoading: isLoadingConceptSets,
  } = useResultConceptSetMembers([
    { uuid: pathologyResultConceptSetUuid, resultKind: 'pathology' },
    { uuid: cytologyResultConceptSetUuid, resultKind: 'cytology' },
  ]);
  const { encounterGroups, error, isLoading, isValidating } = usePathologyResultObservations(
    resolvedPatientUuid,
    members,
  );

  const title = t('pathologyResultsTitle', 'Pathology Results');
  const combinedError = conceptSetError || error;
  const combinedLoading = isLoadingConceptSets || isLoading;

  if (combinedLoading) {
    return <DataTableSkeleton role="progressbar" compact={!isTablet} zebra />;
  }
  if (combinedError) {
    return <ErrorState error={combinedError} headerTitle={title} />;
  }
  if (!encounterGroups.length) {
    return <EmptyState displayText={t('results', 'Results')} headerTitle={title} />;
  }

  const headers = [{ key: 'summary', header: '' }];
  // encounterGroups is already newest-first; expand that most-recent encounter by default.
  const rows = encounterGroups.map((group) => ({
    id: group.encounterUuid || group.observations[0]?.id,
    summary: '',
  }));
  const mostRecentRowId = rows[0]?.id;

  return (
    <div className={styles.container}>
      <CardHeader title={title}>
        {isValidating ? <InlineLoading description={t('refreshing', 'Refreshing...')} /> : null}
      </CardHeader>
      <DataTable rows={rows} headers={headers} size={isTablet ? 'lg' : 'sm'} useZebraStyles>
        {({ rows, getRowProps, getTableProps, expandRow }) => (
          <TableContainer className={styles.tableContainer}>
            <ExpandDefaultRow expandRow={expandRow} rowId={mostRecentRowId} />
            <Table {...getTableProps()}>
              <TableBody>
                {rows.map((row) => {
                  const group = encounterGroups.find(
                    (item) => (item.encounterUuid || item.observations[0]?.id) === row.id,
                  );
                  const resultLabel =
                    group?.resultKind === 'cytology'
                      ? t('cytologyResultsTitle', 'Cytology Results')
                      : t('pathologyResultsTitle', 'Pathology Results');
                  const datetime = group?.encounterDatetime ? formatDatetime(parseDate(group.encounterDatetime)) : '—';

                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow {...getRowProps({ row })}>
                        <TableCell>
                          <span className={styles.encounterSummary}>
                            <span className={styles.encounterFormName}>{resultLabel}</span>
                            <span className={styles.encounterDate}>{datetime}</span>
                          </span>
                        </TableCell>
                      </TableExpandRow>
                      {row.isExpanded && group ? (
                        <TableExpandedRow className={styles.expandedRow} colSpan={2}>
                          <ResultObservations observations={group.observations} />
                        </TableExpandedRow>
                      ) : (
                        <TableExpandedRow className={styles.hiddenRow} colSpan={2} />
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default PathologyResults;
