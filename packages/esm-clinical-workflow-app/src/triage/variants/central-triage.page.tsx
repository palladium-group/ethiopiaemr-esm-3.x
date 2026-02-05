import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineNotification } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { ExtensionSlot, TriagePictogram, launchWorkspace, PageHeader, useConfig } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import PatientBanner from '../patient-banner.component';
import { useStartVisitAndLaunchTriageForm } from '../useStartVisitAndLaunchTriageForm';
import EmptyState from './empty-state.component';
import styles from '../triage-dashboard.scss';

const CentralTriagePage: React.FC = () => {
  const { t } = useTranslation();
  const { triageVariants } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = useState<string | null>(null);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();

  const variantConfig = triageVariants['central'];

  const handleRegisterNewPatient = useCallback(() => {
    launchWorkspace('patient-registration-workspace', {
      workspaceTitle: t('registerNewPatient', 'Register New Patient'),
      onPatientRegistered: (uuid: string) => {
        if (variantConfig?.patientTypes && Object.keys(variantConfig.patientTypes).length > 0) {
          setPatientUuid(uuid);
          launchWorkspace('patient-type-selection-workspace', {
            patientUuid: uuid,
            variantConfig,
          });
        } else if (variantConfig?.formUuid && variantConfig?.name) {
          handleStartVisitAndLaunchTriageForm(uuid, variantConfig.formUuid, variantConfig.name);
        }
      },
    });
  }, [t, handleStartVisitAndLaunchTriageForm, variantConfig]);

  if (!variantConfig || !variantConfig.formUuid) {
    return (
      <div className={styles.triageDashboardContainer}>
        <PageHeader title={t('triage', 'Triage')} illustration={<TriagePictogram />} />
        <InlineNotification
          kind="error"
          title={t('triageNotConfigured', 'Triage not configured')}
          subtitle={t('configureTriageVariant', 'Please configure the Central Triage form.')}
        />
      </div>
    );
  }

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader className={styles.pageHeader} title="Central Triage" illustration={<TriagePictogram />} />

      <div className={styles.headerActions}>
        <ExtensionSlot
          className={styles.patientSearchBar}
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid: string) => setPatientUuid(patientUuid),
            buttonProps: { kind: 'secondary' },
          }}
        />
        <Button onClick={handleRegisterNewPatient} kind="tertiary" renderIcon={Add}>
          {t('registerNewPatient', 'Register New Patient')}
        </Button>
      </div>

      {!patientUuid ? (
        <EmptyState />
      ) : (
        <PatientBanner patientUuid={patientUuid} variantConfig={variantConfig} setPatientUuid={setPatientUuid} />
      )}
    </div>
  );
};

export default CentralTriagePage;
