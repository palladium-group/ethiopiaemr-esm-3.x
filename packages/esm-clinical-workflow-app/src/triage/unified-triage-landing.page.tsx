import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineNotification } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import {
  ExtensionSlot,
  TriagePictogram,
  launchWorkspace,
  PageHeader,
  useConfig,
  UserHasAccess,
} from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import PatientBanner from './patient-banner.component';
import { useStartVisitAndLaunchTriageForm } from './useStartVisitAndLaunchTriageForm';
import VisitsTable from '../patient-scoreboard/visits-table/visits-table.component';
import { useActiveVisits } from '../patient-scoreboard/hooks/useVisitList';
import { DEFAULT_PAGE_SIZE } from '../constants';
import styles from './triage-dashboard.scss';
import { Permissions } from '../permission/permissions.constants';
import { findTriageDefinition, resolveTriageIdFromPathname } from './triage-config';

function subscribeSpaPathname(onChange: () => void) {
  window.addEventListener('single-spa:routing-event', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('single-spa:routing-event', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

function getWindowPathname() {
  return window.location.pathname;
}

export default function UnifiedTriageDashboardPage() {
  const { t } = useTranslation();
  const pathname = useSyncExternalStore(subscribeSpaPathname, getWindowPathname, getWindowPathname);
  const { triageDefinitions } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();

  const triageId = useMemo(
    () => resolveTriageIdFromPathname(pathname, triageDefinitions),
    [pathname, triageDefinitions],
  );

  const variantConfig = useMemo(
    () => (triageId ? findTriageDefinition(triageDefinitions, triageId) : undefined),
    [triageDefinitions, triageId],
  );

  const startIndex = (currentPage - 1) * pageSize;
  const paginationParams = {
    startIndex,
    limit: pageSize,
  };

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
    if (!variantConfig) {
      return;
    }
    launchWorkspace('patient-registration-workspace', {
      workspaceTitle: t('newPatient', 'New Patient'),
      onPatientRegistered: (uuid: string) => {
        if (variantConfig.formUuid && variantConfig.name) {
          handleStartVisitAndLaunchTriageForm(uuid, variantConfig.formUuid, variantConfig.name);
        }
      },
    });
  }, [t, handleStartVisitAndLaunchTriageForm, variantConfig]);

  if (!triageId || !variantConfig || !variantConfig.formUuid) {
    return (
      <div className={styles.triageDashboardContainer}>
        <PageHeader title={t('triage', 'Triage')} illustration={<TriagePictogram />} />
        <InlineNotification
          kind="error"
          title={t('triageNotConfigured', 'Triage not configured')}
          subtitle={t('configureTriageVariant', 'Please configure the triage form in clinical workflow settings.')}
        />
      </div>
    );
  }

  if (!variantConfig.enabled) {
    return (
      <div className={styles.triageDashboardContainer}>
        <PageHeader title={t('triage', 'Triage')} illustration={<TriagePictogram />} />
        <InlineNotification
          kind="warning"
          title={t('triageDisabled', 'Triage disabled')}
          subtitle={t('triageDisabledMessage', 'This triage entry is disabled in configuration.')}
        />
      </div>
    );
  }

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader className={styles.pageHeader} title={variantConfig.displayName} illustration={<TriagePictogram />} />

      <div className={styles.headerActions}>
        <ExtensionSlot
          className={styles.patientSearchBar}
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (selectedPatientUuid: string) => {
              setPatientUuid(selectedPatientUuid);
              setCurrentPage(1);
            },
            buttonProps: { kind: 'secondary' },
          }}
        />
        <UserHasAccess privilege={Permissions.TriageRegisterNewPatient}>
          <Button onClick={handleRegisterNewPatient} kind="tertiary" renderIcon={Add}>
            {t('newPatient', 'New Patient')}
          </Button>
        </UserHasAccess>
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
            onClickPatient={(clickedUuid) => {
              setPatientUuid(clickedUuid);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        <PatientBanner patientUuid={patientUuid} variantConfig={variantConfig} setPatientUuid={setPatientUuid} />
      )}
    </div>
  );
}
