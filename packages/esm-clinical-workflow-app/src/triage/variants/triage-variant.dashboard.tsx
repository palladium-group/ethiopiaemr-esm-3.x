import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Add } from '@carbon/react/icons';
import { TriagePictogram, PageHeader, launchWorkspace, ExtensionSlot } from '@openmrs/esm-framework';
import styles from '../triage-dashboard.scss';

import { useTriageVariant } from './useTriageVariant';
import { TriageConfigurationGuard } from './triage-configuration-guard.component';
import { TriageContent } from './triage-content.component';
import { useStartVisitAndLaunchTriageForm } from '../useStartVisitAndLaunchTriageForm';
import { Button } from '@carbon/react';

interface TriageVariantDashboardProps {
  variant: string;
}

const TriageVariantDashboard: React.FC<TriageVariantDashboardProps> = ({ variant }) => {
  const { variantConfig, variantKey, isValid, pathSegment } = useTriageVariant(variant);
  const [patientUuid, setPatientUuid] = useState<string | null>(null);

  useEffect(() => setPatientUuid(null), [pathSegment]);

  if (!isValid) {
    return <TriageConfigurationGuard variantKey={variantKey} />;
  }

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader className={styles.pageHeader} title={variantConfig.displayName} illustration={<TriagePictogram />} />

      <TriageActions onPatientSelect={setPatientUuid} variantConfig={variantConfig} />

      <TriageContent
        patientUuid={patientUuid}
        variantConfig={variantConfig}
        pathSegment={pathSegment}
        onClearPatient={() => setPatientUuid(null)}
      />
    </div>
  );
};

export default TriageVariantDashboard;

const TriageActions = ({ onPatientSelect, variantConfig }) => {
  const { t } = useTranslation();
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();

  const handleRegister = useCallback(() => {
    launchWorkspace('patient-registration-workspace', {
      workspaceTitle: t('registerNewPatient', 'Register New Patient'),
      onPatientRegistered: (uuid) => {
        handleStartVisitAndLaunchTriageForm(uuid, variantConfig.formUuid, variantConfig.name);
      },
    });
  }, [t, handleStartVisitAndLaunchTriageForm, variantConfig]);

  return (
    <div className={styles.headerActions}>
      <ExtensionSlot
        className={styles.patientSearchBar}
        name="patient-search-bar-slot"
        state={{
          selectPatientAction: onPatientSelect,
          buttonProps: { kind: 'secondary' },
        }}
      />
      <Button onClick={handleRegister} kind="tertiary" renderIcon={Add}>
        {t('registerNewPatient', 'Register New Patient')}
      </Button>
    </div>
  );
};
