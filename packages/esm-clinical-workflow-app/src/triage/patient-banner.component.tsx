import React from 'react';
import { ExtensionSlot, usePatient, useVisit } from '@openmrs/esm-framework';
import { Button, Dropdown, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Close, Stethoscope } from '@carbon/react/icons';
import { useStartVisitAndLaunchTriageForm, launchTriageFormWorkspace } from './useStartVisitAndLaunchTriageForm';

import type { TriageVariantConfig } from '../config-schema';
import styles from './patient-banner.scss';

type PatientBannerProps = {
  patientUuid: string;
  variantConfig: TriageVariantConfig;
  setPatientUuid: (patientUuid: string | undefined) => void;
};

const PatientBanner: React.FC<PatientBannerProps> = ({ patientUuid, variantConfig, setPatientUuid }) => {
  const { t } = useTranslation();
  const { isLoading: isVisitLoading, activeVisit } = useVisit(patientUuid);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();
  const { isLoading, error, patient } = usePatient(patientUuid);

  const handleLaunchTriageForm = (formUuid: string, formName: string) => {
    if (activeVisit) {
      launchTriageFormWorkspace(patient, patientUuid, activeVisit, formUuid, formName, t);
    } else {
      handleStartVisitAndLaunchTriageForm(patientUuid, formUuid, formName);
    }
  };

  const patientTypeItems = variantConfig.patientTypes
    ? Object.entries(variantConfig.patientTypes).map(([key, config]) => ({
        id: key,
        label: t(`patientType_${key}`, config.displayName),
        formUuid: config.formUuid,
        formName: config.formName,
      }))
    : [];

  if (isLoading || isVisitLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <div className={styles.patientBannerContainer}>
      <div className={styles.patientBannerHeader}>
        {patientTypeItems.length > 0 ? (
          <Dropdown
            id="patient-type-dropdown"
            className={styles.patientTypeDropdown}
            items={patientTypeItems}
            itemToString={(item) => item?.label || ''}
            titleText={t('selectPatientType', 'Record Vitals')}
            label={t('selectPatientType', 'Select Triage Type')}
            onChange={({ selectedItem }) => {
              if (selectedItem) {
                handleLaunchTriageForm(selectedItem.formUuid, selectedItem.formName);
              }
            }}
          />
        ) : (
          <Button
            kind="ghost"
            renderIcon={Stethoscope}
            onClick={() => handleLaunchTriageForm(variantConfig.formUuid, variantConfig.name)}>
            {t('triageForm', 'Triage form')}
          </Button>
        )}
        <Button kind="danger--ghost" renderIcon={Close} onClick={() => setPatientUuid(undefined)}>
          {t('close', 'Close')}
        </Button>
      </div>
      {patient && (
        <ExtensionSlot
          name="patient-header-slot"
          state={{
            patient,
            patientUuid: patientUuid,
            hideActionsOverflow: true,
          }}
        />
      )}
    </div>
  );
};

export default PatientBanner;
