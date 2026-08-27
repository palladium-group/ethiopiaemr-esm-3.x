import React from 'react';
import { ExtensionSlot, usePatient, UserHasAccess, useVisit } from '@openmrs/esm-framework';
import { Button, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Close, Stethoscope } from '@carbon/react/icons';
import { useStartVisitAndLaunchTriageForm, launchTriageFormWorkspace } from './useStartVisitAndLaunchTriageForm';
import type { TriageDefinitionConfig } from '../config-schema';
import styles from './patient-banner.scss';
import { Permissions } from '../permission/permissions.constants';

type PatientBannerProps = {
  patientUuid: string;
  variantConfig: TriageDefinitionConfig;
  setPatientUuid: (patientUuid: string | undefined) => void;
};

const PatientBanner: React.FC<PatientBannerProps> = ({ patientUuid, variantConfig, setPatientUuid }) => {
  const { t } = useTranslation();
  const { isLoading: isVisitLoading, activeVisit } = useVisit(patientUuid);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();
  const { isLoading, patient } = usePatient(patientUuid);
  const handleLaunchTriageForm = () => {
    if (activeVisit && patient) {
      launchTriageFormWorkspace(
        patient,
        patientUuid,
        activeVisit,
        variantConfig.formUuid,
        variantConfig.name,
        t,
        variantConfig.id,
      );
    } else {
      handleStartVisitAndLaunchTriageForm(patientUuid, variantConfig.formUuid, variantConfig.name, variantConfig.id);
    }
  };

  if (isLoading || isVisitLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <div className={styles.patientBannerContainer}>
      <div className={styles.patientBannerHeader}>
        <UserHasAccess privilege={Permissions.AddTriageForm}>
          <Button kind="ghost" renderIcon={Stethoscope} onClick={handleLaunchTriageForm}>
            {t('triageForm', 'Triage form')}
          </Button>
        </UserHasAccess>
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
