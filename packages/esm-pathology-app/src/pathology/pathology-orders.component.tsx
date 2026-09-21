import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandRow,
} from '@carbon/react';
import { CardHeader, EmptyState, ErrorState, useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { formatDatetime, parseDate, useConfig, useLayoutType, type Visit } from '@openmrs/esm-framework';
import { type PathologyConfig } from '../config-schema';
import { PATHOLOGY_ORDER_WORKSPACE } from '../constants';
import { usePathologyRequestEncounters } from './pathology-orders.resource';
import RequestObservations from './request-observations.component';
import styles from './pathology-orders.scss';

interface PathologyOrdersProps {
  patient?: fhir.Patient;
  patientUuid?: string;
  visitContext?: Visit;
}

const ExpandDefaultRow: React.FC<{ expandRow: (rowId: string) => void; rowId?: string }> = ({ expandRow, rowId }) => {
  const didExpand = useRef(false);

  useEffect(() => {
    if (rowId && !didExpand.current) {
      expandRow(rowId);
      didExpand.current = true;
    }
  }, [expandRow, rowId]);

  return null;
};

const PathologyOrders: React.FC<PathologyOrdersProps> = ({ patient, patientUuid, visitContext }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { pathologyRequestForms } = useConfig<PathologyConfig>();
  const resolvedPatientUuid = patientUuid ?? patient?.id;

  const formUuids = useMemo(
    () => (pathologyRequestForms ?? []).map((option) => option.formUuid).filter(Boolean),
    [pathologyRequestForms],
  );

  const { encounters, error, isLoading } = usePathologyRequestEncounters(resolvedPatientUuid, formUuids);
  const launchPathologyOrderWorkspace = useLaunchWorkspaceRequiringVisit(
    resolvedPatientUuid,
    PATHOLOGY_ORDER_WORKSPACE,
  );

  const title = t('pathologyOrdersTitle', 'Pathology Orders');

  const openNewOrder = useCallback(() => {
    if (!resolvedPatientUuid) {
      return;
    }
    launchPathologyOrderWorkspace(
      { patientUuid: resolvedPatientUuid, patient, visitContext },
      { patient, patientUuid: resolvedPatientUuid, visitContext },
      { patient, patientUuid: resolvedPatientUuid, visitContext },
    );
  }, [launchPathologyOrderWorkspace, patient, resolvedPatientUuid, visitContext]);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" compact={!isTablet} zebra />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={title} />;
  }
  if (!encounters.length) {
    return <EmptyState displayText={t('orders', 'Orders')} headerTitle={title} launchForm={openNewOrder} />;
  }

  const headers = [{ key: 'summary', header: '' }];

  const rows = encounters.map((encounter) => ({
    id: encounter.uuid,
    datetime: encounter.encounterDatetime ? formatDatetime(parseDate(encounter.encounterDatetime)) : '—',
    formName: encounter.form?.display || encounter.form?.name || t('unknownForm', 'Unknown form'),
    summary: '',
  }));

  return (
    <div className={styles.container}>
      <CardHeader title={title}>
        <Button kind="ghost" size={isTablet ? 'md' : 'sm'} onClick={openNewOrder}>
          {t('recordOrders', 'Record Orders')}
        </Button>
      </CardHeader>
      <DataTable rows={rows} headers={headers} size={isTablet ? 'lg' : 'sm'} useZebraStyles>
        {({ rows, getRowProps, getTableProps, expandRow }) => (
          <TableContainer className={styles.tableContainer}>
            <ExpandDefaultRow expandRow={expandRow} rowId={rows[rows.length - 1]?.id} />
            <Table {...getTableProps()}>
              <TableBody>
                {rows.map((row) => {
                  const encounter = encounters.find((item) => item.uuid === row.id);
                  const formName = encounter?.form?.display || encounter?.form?.name || '';
                  const datetime = encounter?.encounterDatetime
                    ? formatDatetime(parseDate(encounter.encounterDatetime))
                    : '—';

                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow {...getRowProps({ row })}>
                        <TableCell>
                          <span className={styles.encounterSummary}>
                            <span className={styles.encounterDate}>{datetime}</span>
                            <span className={styles.encounterFormName}>{formName}</span>
                          </span>
                        </TableCell>
                      </TableExpandRow>
                      {row.isExpanded && encounter ? (
                        <TableExpandedRow className={styles.expandedRow} colSpan={2}>
                          <RequestObservations observations={encounter.obs} />
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

export default PathologyOrders;
