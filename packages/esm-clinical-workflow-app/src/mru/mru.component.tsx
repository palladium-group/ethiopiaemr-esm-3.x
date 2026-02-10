import React, { useState } from 'react';
import { Button, InlineLoading, Layer } from '@carbon/react';
import {
  ExtensionSlot,
  PageHeader,
  RegistrationPictogram,
  fetchCurrentPatient,
  launchWorkspace,
  navigate,
  useConfig,
  useVisit,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { Close, Edit, Money } from '@carbon/react/icons';
import useSWR from 'swr';
import { useParams } from 'react-router-dom';

import styles from './mru.scss';
import { type ClinicalWorkflowConfig } from '../config-schema';
import VisitsTable from '../patient-scoreboard/visits-table/visits-table.component';
import { useActiveVisits } from '../patient-scoreboard/hooks/useVisitList';
const MRU: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('medicalRecordUpdate', 'Medical Record Unit(MRU)')}
        illustration={<RegistrationPictogram />}
        className={styles.pageHeader}
      />
      <PatientSearch />
    </div>
  );
};

export default MRU;

const PatientSearch: React.FC = () => {
  const params = useParams<{ patientUuid: string }>();
  const { t } = useTranslation();
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = React.useState<string>(params.patientUuid || undefined);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: patient, isLoading } = useSWR(patientUuid ? ['patient', patientUuid] : null, () =>
    fetchCurrentPatient(patientUuid!),
  );
  const { activeVisit } = useVisit(patientUuid);

  // Calculate startIndex for pagination
  const startIndex = (currentPage - 1) * pageSize;
  const paginationParams = {
    startIndex,
    limit: pageSize,
  };

  // Fetch active visits for the table (only when no patient is selected)
  const {
    visits: activeVisits,
    isLoading: isLoadingVisits,
    count: activeCount,
  } = useActiveVisits(!patientUuid ? paginationParams : undefined);

  const handlePaginationChange = ({ page, pageSize: newPageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
  };

  // TODO: Add ability for user to edit billing information

  const hasAtLeastOneBillingInformation = activeVisit?.attributes?.some(
    (attribute) => attribute.attributeType.uuid === billingVisitAttributeTypes.paymentMethod,
  );

  const handleLaunchBillingInformationWorkspace = () => {
    launchWorkspace('billing-information-workspace', {
      patientUuid: patientUuid,
    });
  };

  const handlePatientInformationEdit = () => {
    navigate({ to: `${window.spaBase}/patient/${patientUuid}/edit` });
  };

  return (
    <div className={styles.patientSearchContainer}>
      <Layer>
        <ExtensionSlot
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid: string) => {
              setPatientUuid(patientUuid);
              setCurrentPage(1); // Reset to page 1 when selecting a patient
            },
            buttonProps: {
              kind: 'secondary',
            },
          }}
        />
      </Layer>
      {isLoading && <InlineLoading description={t('loading', 'Loading...')} />}
      {patient && (
        <div className={styles.patientHeaderContainer}>
          <div className={styles.patientHeaderActions}>
            <Button kind="ghost" size="md" renderIcon={Edit} onClick={handlePatientInformationEdit}>
              {t('editPatientInformation', 'Edit Patient Information')}
            </Button>
            <Button
              disabled={!activeVisit}
              kind="ghost"
              size="md"
              renderIcon={Money}
              onClick={handleLaunchBillingInformationWorkspace}>
              {hasAtLeastOneBillingInformation
                ? t('editBillingInformation', 'Edit Billing Information')
                : t('addBillingInformation', 'Add Billing Information')}
            </Button>
            <Button
              kind="ghost"
              size="md"
              renderIcon={Close}
              onClick={() => {
                setPatientUuid(undefined);
                setCurrentPage(1); // Reset to page 1 when closing patient
              }}>
              {t('close', 'Close')}
            </Button>
          </div>
          <ExtensionSlot
            name="patient-header-slot"
            state={{
              patient,
              patientUuid: patientUuid,
              hideActionsOverflow: true,
            }}
          />
        </div>
      )}
      {!patientUuid && (
        <VisitsTable
          visits={activeVisits}
          isLoading={isLoadingVisits}
          tableHeading={t('activeVisits', 'Active Visits')}
          totalCount={activeCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPaginationChange={handlePaginationChange}
          useLocalPagination={false}
        />
      )}
    </div>
  );
};
