import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineNotification } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { ExtensionSlot, TriagePictogram, launchWorkspace, PageHeader, useConfig } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import PatientBanner from '../patient-banner.component';
import VisitsTable from '../../patient-scoreboard/visits-table/visits-table.component';
import { useActiveVisits } from '../../patient-scoreboard/hooks/useVisitList';
import { DEFAULT_PAGE_SIZE } from '../../constants';
import styles from '../triage-dashboard.scss';

const EmergencyTriagePage: React.FC = () => {
  const { t } = useTranslation();
  const { triageVariants } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const variantConfig = triageVariants['emergency'];

  // Calculate startIndex for pagination
  const startIndex = (currentPage - 1) * pageSize;
  const paginationParams = {
    startIndex,
    limit: pageSize,
  };

  // Fetch active visits for the table (skip when patient selected - table hidden)
  const {
    visits: activeVisits,
    isLoading: isLoadingVisits,
    count: activeCount,
  } = useActiveVisits(patientUuid ? { skip: true } : paginationParams);

  const handlePaginationChange = ({ page, pageSize: newPageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
  };

  const handleRegisterNewPatient = useCallback(() => {
    launchWorkspace('patient-registration-workspace', {
      workspaceTitle: t('newPatient', 'New Patient'),
      onPatientRegistered: (uuid: string) => {
        launchWorkspace('emergency-queue-selection-workspace', {
          patientUuid: uuid,
          variantConfig,
          formUuid: variantConfig.formUuid,
          formName: variantConfig.name,
        });
      },
    });
  }, [t, variantConfig]);

  if (!variantConfig || !variantConfig.formUuid) {
    return (
      <div className={styles.triageDashboardContainer}>
        <PageHeader title={t('triage', 'Triage')} illustration={<TriagePictogram />} />
        <InlineNotification
          kind="error"
          title={t('triageNotConfigured', 'Triage not configured')}
          subtitle={t('configureTriageVariant', 'Please configure the Emergency Triage form.')}
        />
      </div>
    );
  }

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader
        className={styles.pageHeader}
        title={t('emergencyTriage', 'Emergency Triage')}
        illustration={<TriagePictogram />}
      />

      <div className={styles.headerActions}>
        <ExtensionSlot
          className={styles.patientSearchBar}
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid: string) => {
              setPatientUuid(patientUuid);
              setCurrentPage(1); // Reset to page 1 when selecting a patient
            },
            buttonProps: { kind: 'secondary' },
          }}
        />
        <Button onClick={handleRegisterNewPatient} kind="tertiary" renderIcon={Add}>
          {t('newPatient', 'New Patient')}
        </Button>
      </div>

      {!patientUuid ? (
        <div className={styles.visitsTableWrapper}>
          <VisitsTable
            visits={activeVisits}
            isLoading={isLoadingVisits}
            tableHeading={t('activeVisits', 'Active Visits')}
            totalCount={activeCount}
            pageSize={pageSize}
            currentPage={currentPage}
            onPaginationChange={handlePaginationChange}
            useLocalPagination={false}
            onClickPatient={(patientUuid) => {
              setPatientUuid(patientUuid);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        <PatientBanner
          patientUuid={patientUuid}
          variantConfig={variantConfig}
          setPatientUuid={setPatientUuid}
          variantType="emergency"
        />
      )}
    </div>
  );
};

export default EmergencyTriagePage;
