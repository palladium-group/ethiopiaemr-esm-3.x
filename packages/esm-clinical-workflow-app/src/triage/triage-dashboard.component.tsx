import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, RadioButtonGroup, RadioButton } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { ExtensionSlot, TriagePictogram, launchWorkspace, PageHeader, useConfig } from '@openmrs/esm-framework';

import styles from './triage-dashboard.scss';
import type { ClinicalWorkflowConfig } from '../config-schema';
import PatientBanner from './patient-banner.component';

const TriageDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { triageServices } = useConfig<ClinicalWorkflowConfig>();
  const [patientUuid, setPatientUuid] = useState<string | null>(null);
  const [selectedTriageService, setSelectedTriageService] = useState<string | null>(null);

  return (
    <div className={styles.triageDashboardContainer}>
      <PageHeader
        className={styles.pageHeader}
        title={t('triageDashboard', 'Triage Dashboard')}
        illustration={<TriagePictogram />}
      />
      <div className={styles.headerActions}>
        <RadioButtonGroup
          legendText={t('selectTriageService', 'Select Triage Service')}
          name="triage-service-radio-button-group"
          valueSelected={selectedTriageService || undefined}
          onChange={(value: string) => setSelectedTriageService(value)}>
          {triageServices.map((service) => (
            <RadioButton
              key={service.formUuid}
              id={service.formUuid}
              labelText={service.name}
              value={service.formUuid}
            />
          ))}
        </RadioButtonGroup>
      </div>
      <div className={styles.headerActions}>
        <ExtensionSlot
          className={`${styles.patientSearchBar} ${selectedTriageService ? '' : styles.disabled}`}
          name="patient-search-bar-slot"
          state={{
            selectPatientAction: (patientUuid: string) => setPatientUuid(patientUuid),
            buttonProps: {
              kind: 'secondary',
            },
          }}
        />
        <Button onClick={() => launchWorkspace('patient-registration-workspace')} kind="tertiary" renderIcon={Add}>
          {t('registerNewPatient', 'Register New Patient')}
        </Button>
      </div>
      {patientUuid && (
        <PatientBanner
          patientUuid={patientUuid}
          selectedTriageService={selectedTriageService}
          setPatientUuid={setPatientUuid}
        />
      )}
    </div>
  );
};

export default TriageDashboard;
