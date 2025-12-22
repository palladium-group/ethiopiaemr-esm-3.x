import React from 'react';
import { ExtensionSlot, usePatient, useVisit } from '@openmrs/esm-framework';
import { Button, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Close, Stethoscope } from '@carbon/react/icons';
import { useStartVisitAndLaunchTriageForm, launchTriageFormWorkspace } from './useStartVisitAndLaunchTriageForm';

import styles from './patient-banner.scss';

type PatientBannerProps = {
  patientUuid: string;
  formUuid: string;
  setPatientUuid: (patientUuid: string | undefined) => void;
};

const PatientBanner: React.FC<PatientBannerProps> = ({ patientUuid, formUuid, setPatientUuid }) => {
  const { t } = useTranslation();
  const { isLoading: isVisitLoading, activeVisit } = useVisit(patientUuid);
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();
  const { isLoading, error, patient } = usePatient(patientUuid);

  const handleLaunchTriageForm = () => {
    if (activeVisit) {
      launchTriageFormWorkspace(patient, patientUuid, activeVisit, formUuid, t);
    } else {
      handleStartVisitAndLaunchTriageForm(patientUuid, formUuid);
    }
  };

  if (isLoading || isVisitLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <div className={styles.patientBannerContainer}>
      <div className={styles.patientBannerHeader}>
        <Button kind="ghost" renderIcon={Stethoscope} onClick={() => handleLaunchTriageForm()}>
          {t('triageForm', 'Triage form')}
        </Button>
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
