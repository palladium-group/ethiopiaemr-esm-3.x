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
  const { observations, error, isLoading, isValidating } = usePathologyResultObservations(resolvedPatientUuid, members);

  const title = t('pathologyResults', 'Pathology Results');
  const combinedError = conceptSetError || error;
  const combinedLoading = isLoadingConceptSets || isLoading;

  if (combinedLoading) {
    return <DataTableSkeleton role="progressbar" compact zebra />;
  }
  if (combinedError) {
    return <ErrorState error={combinedError} headerTitle={title} />;
  }
  if (!observations.length) {
    return <EmptyState displayText={t('pathologyResultsLower', 'pathology results')} headerTitle={title} />;
  }

  const headers = [
    { key: 'issued', header: t('date', 'Date') },
    { key: 'field', header: t('resultField', 'Result field') },
    { key: 'value', header: t('resultValue', 'Value') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const rows = observations.map((observation) => ({
    id: observation.id,
    issued: observation.issued ? formatDatetime(parseDate(observation.issued)) : '—',
    field: observation.field,
    value: observation.value,
    status: observation.status || '—',
  }));

  return (
    <div>
      <CardHeader title={title}>
        {isValidating ? <InlineLoading description={t('refreshing', 'Refreshing...')} /> : null}
      </CardHeader>
      <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
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
    </div>
  );
};

export default PathologyResults;
