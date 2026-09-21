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
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDatetime, parseDate, useConfig } from '@openmrs/esm-framework';
import { type PathologyConfig } from '../config-schema';
import { usePathologyResultObservations, useResultConceptSetMembers } from './pathology-results.resource';
import styles from './pathology-results.scss';

interface PathologyResultsProps {
  patient?: fhir.Patient;
  patientUuid?: string;
}

const PathologyResults: React.FC<PathologyResultsProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { pathologyResultConceptSetUuid, cytologyResultConceptSetUuid } = useConfig<PathologyConfig>();
  const resolvedPatientUuid = patientUuid ?? patient?.id;
  const {
    members,
    error: conceptSetError,
    isLoading: isLoadingConceptSets,
  } = useResultConceptSetMembers([pathologyResultConceptSetUuid, cytologyResultConceptSetUuid]);
  const { encounterGroups, error, isLoading, isValidating } = usePathologyResultObservations(
    resolvedPatientUuid,
    members,
  );

  const title = t('pathologyResultsTitle', 'Pathology Results');
  const combinedError = conceptSetError || error;
  const combinedLoading = isLoadingConceptSets || isLoading;

  if (combinedLoading) {
    return <DataTableSkeleton role="progressbar" compact zebra />;
  }
  if (combinedError) {
    return <ErrorState error={combinedError} headerTitle={title} />;
  }
  if (!encounterGroups.length) {
    return <EmptyState displayText={t('results', 'Results')} headerTitle={title} />;
  }

  const headers = [
    { key: 'field', header: t('resultField', 'Result field') },
    { key: 'value', header: t('resultValue', 'Value') },
    { key: 'issued', header: t('date', 'Date') },
  ];

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={title}>
        {isValidating ? <InlineLoading description={t('refreshing', 'Refreshing...')} /> : null}
      </CardHeader>
      {encounterGroups.map((group) => {
        const encounterLabel = group.encounterDatetime
          ? formatDatetime(parseDate(group.encounterDatetime))
          : group.encounterDisplay || t('unknownEncounter', 'Unknown encounter');
        const rows = group.observations.map((observation) => ({
          id: observation.id,
          field: observation.field,
          value: observation.value,
          issued: observation.issued ? formatDatetime(parseDate(observation.issued)) : '—',
        }));

        return (
          <DataTable
            key={group.encounterUuid || group.observations[0]?.id}
            rows={rows}
            headers={headers}
            size="sm"
            useZebraStyles>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      <TableHeader className={styles.encounterHeaderCell} colSpan={headers.length}>
                        {encounterLabel}
                      </TableHeader>
                    </TableRow>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
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
        );
      })}
    </div>
  );
};

export default PathologyResults;
