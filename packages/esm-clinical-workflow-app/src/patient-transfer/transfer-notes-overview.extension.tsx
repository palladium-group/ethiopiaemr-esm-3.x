import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton, InlineLoading } from '@carbon/react';
import { useLayoutType } from '@openmrs/esm-framework';
import { CardHeader, EmptyState, ErrorState, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { useTransferNotes } from './transfer-notes.resource';
import TransferNotesTable from './transfer-notes-table.component';
import styles from './transfer-notes-overview.scss';

interface TransferNotesOverviewProps {
  patientUuid: string;
  patient: fhir.Patient;
  basePath: string;
}

/**
 * This extension displays transfer notes in the patient chart.
 * It only shows transfer notes from the current visit.
 * It uses the patient chart store and MUST only be mounted within the patient chart.
 */
const TransferNotesOverview: React.FC<TransferNotesOverviewProps> = ({ patientUuid, patient, basePath }) => {
  const pageSize = 5;
  const { t } = useTranslation();
  const pageUrl = `\${openmrsSpaBase}/patient/${patient.id}/chart/Forms & Notes`;
  const urlLabel = t('seeAll', 'See all');

  // Get current visit from patient chart store
  const { visitContext } = usePatientChartStore(patientUuid);
  const visitUuid = visitContext?.uuid || null;

  const displayText = t('transferNotes', 'Transfer notes');
  const headerTitle = t('transferNotes', 'Transfer notes');
  const { transferNotes, error, isLoading, isValidating } = useTransferNotes(patientUuid, visitUuid);
  const layout = useLayoutType();
  const isDesktop = layout === 'large-desktop' || layout === 'small-desktop';

  // Don't show the widget if there's no current visit
  if (!visitUuid) {
    return null;
  }

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" compact={isDesktop} zebra />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }
  // Only show the widget if there are transfer notes for the current visit
  if (!transferNotes?.length) {
    return null;
  }

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={headerTitle}>
        <span>{isValidating ? <InlineLoading /> : null}</span>
      </CardHeader>
      <TransferNotesTable notes={transferNotes} pageSize={pageSize} urlLabel={urlLabel} pageUrl={pageUrl} />
    </div>
  );
};

export default TransferNotesOverview;
