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
import { usePathologyReports } from './pathology-results.resource';

interface PathologyResultsProps {
  patient?: fhir.Patient;
  patientUuid?: string;
}

const PathologyResults: React.FC<PathologyResultsProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { pathologyResultLoincCodes } = useConfig<PathologyConfig>();
  const resolvedPatientUuid = patientUuid ?? patient?.id;
  const { reports, error, isLoading, isValidating } = usePathologyReports(
    resolvedPatientUuid,
    pathologyResultLoincCodes,
  );

  const title = t('pathologyResults', 'Pathology Results');

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" compact zebra />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={title} />;
  }
  if (!reports.length) {
    return <EmptyState displayText={t('pathologyResultsLower', 'pathology results')} headerTitle={title} />;
  }

  const headers = [
    { key: 'issued', header: t('date', 'Date') },
    { key: 'code', header: t('report', 'Report') },
    { key: 'diagnosis', header: t('diagnosisConclusion', 'Diagnosis / conclusion') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const rows = reports.map((report) => ({
    id: report.id,
    issued: report.issued ? formatDatetime(parseDate(report.issued)) : '—',
    code: report.code,
    diagnosis: report.diagnosis,
    status: report.status,
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
