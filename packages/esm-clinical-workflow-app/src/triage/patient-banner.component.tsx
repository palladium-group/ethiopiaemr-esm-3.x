import React from 'react';
import { ExtensionSlot, usePatient, UserHasAccess, useVisit } from '@openmrs/esm-framework';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Close, Stethoscope } from '@carbon/react/icons';
import { useStartVisitAndLaunchTriageForm } from './useStartVisitAndLaunchTriageForm';
import { usePatientAssignedQueue } from './use-patient-assigned-queue';
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
  const { isLoading: isPatientLoading, patient } = usePatient(patientUuid);
  const { displayQueue, isLoading: isLoadingAssignedQueue } = usePatientAssignedQueue(patientUuid, activeVisit);

  const hasActiveVisit = Boolean(activeVisit);

  const handleLaunchTriageForm = () => {
    if (!hasActiveVisit) {
      handleStartVisitAndLaunchTriageForm(patientUuid, variantConfig.formUuid, variantConfig.name, variantConfig.id);
    }
  };

  if (isPatientLoading || isVisitLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <div className={styles.patientBannerContainer}>
      <div className={styles.patientBannerHeader}>
        <UserHasAccess privilege={Permissions.AddTriageForm}>
          <Button
            kind="ghost"
            renderIcon={Stethoscope}
            onClick={handleLaunchTriageForm}
            disabled={hasActiveVisit}
            title={hasActiveVisit ? t('patientHasActiveVisit', 'Patient already has an active visit') : undefined}>
            {t('triageForm', 'Triage form')}
          </Button>
        </UserHasAccess>
        <Button kind="danger--ghost" renderIcon={Close} onClick={() => setPatientUuid(undefined)}>
          {t('close', 'Close')}
        </Button>
      </div>

      {hasActiveVisit && (
        <div className={styles.activeVisitAlertWrapper}>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={t('patientHasActiveVisit', 'Patient already has an active visit')}>
            <div className={styles.notificationContent}>
              <p>
                {t(
                  'patientAlreadyHasActiveVisitTriageMessage',
                  'This patient already has an active visit and cannot be triaged again. If you want to add the patient to a queue, go to the Service Queues page, select "Add patient to queue", search for the patient, and assign them to the designated queue.',
                )}
              </p>
              <div className={styles.queueInfoRow}>
                <span className={styles.queueLabel}>{t('currentlyAssignedQueue', 'Currently assigned queue')}:</span>{' '}
                {isLoadingAssignedQueue ? (
                  <span className={styles.queueLoadingText}>{t('loadingQueue', 'Loading queue...')}</span>
                ) : (
                  <span className={styles.queueValue}>
                    {displayQueue || t('notAssignedToAnyQueue', 'Not assigned to any queue')}
                  </span>
                )}
              </div>
            </div>
          </InlineNotification>
        </div>
      )}

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
