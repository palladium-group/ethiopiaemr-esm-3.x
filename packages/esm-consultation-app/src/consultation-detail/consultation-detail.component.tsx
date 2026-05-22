import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, SkeletonText, Tag } from '@carbon/react';
import { useSession } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import ConsultationConversationView from './consultation-conversation-view.component';
import { useConsultationsAwaitingReview } from '../hooks/useConsultationsAwaitingReview';
import { useConsultationPrivileges } from '../hooks/useConsultationPrivileges';
import { useConsultationsByPatient } from '../hooks/useConsultationsByPatient';
import { useLaunchConsultationForm } from '../hooks/useLaunchConsultationForm';
import { canRespondToConsultation as canRespondAtSessionLocation } from '../resources/consultation.resource';
import type { ConsultationStatus } from '../types/consultation.types';
import styles from './consultation-detail.scss';

interface ConsultationDetailProps {
  patient: fhir.Patient;
}

function getStatusTagType(status: ConsultationStatus): 'green' | 'gray' {
  return status === 'completed' ? 'green' : 'gray';
}

const ConsultationDetail: React.FC<ConsultationDetailProps> = ({ patient }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const { encounterUuid } = useParams<{ encounterUuid: string }>();
  const headerTitle = t('consultationDetails', 'Consultation details');
  const { consultations, error, isLoading, mutateConsultations } = useConsultationsByPatient(patient.id);
  const { markConsultationSeen } = useConsultationsAwaitingReview(patient.id);
  const { canRequestConsultation, canRespondToConsultation, canViewConsultations } = useConsultationPrivileges();
  const consultation = consultations?.find((item) => item.encounterUuid === encounterUuid);
  const { isLaunching, launchConsultationForm } = useLaunchConsultationForm(patient.id, {
    onConsultationSaved: () => {
      mutateConsultations();
    },
  });
  const canRespond =
    consultation && canRespondToConsultation
      ? canRespondAtSessionLocation(consultation, session?.sessionLocation?.uuid)
      : false;

  useEffect(() => {
    if (consultation?.status === 'completed') {
      markConsultationSeen(consultation);
    }
  }, [consultation, markConsultationSeen]);

  const handleBack = () => {
    navigate('..');
  };

  const handleRespond = useCallback(() => {
    if (!consultation) {
      return;
    }

    launchConsultationForm(consultation.encounterUuid).catch((launchError) => {
      console.error('Error launching consultation response form:', launchError);
    });
  }, [consultation, launchConsultationForm]);

  const handleCreateAnotherConsultation = useCallback(() => {
    launchConsultationForm().catch((launchError) => {
      console.error('Error launching consultation form workspace:', launchError);
    });
  }, [launchConsultationForm]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <SkeletonText heading width="30%" />
        <SkeletonText paragraph lineCount={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }

  if (!canViewConsultations) {
    return (
      <ErrorState
        error={
          new Error(
            t('consultationPrivilegeRequired', 'You do not have permission to perform this consultation action.'),
          )
        }
        headerTitle={headerTitle}
      />
    );
  }

  if (!consultation) {
    return (
      <div className={styles.container}>
        <Button kind="ghost" onClick={handleBack}>
          {t('backToConsultations', 'Back to consultations')}
        </Button>
        <p>{t('consultationNotFound', 'Consultation not found.')}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Button kind="ghost" onClick={handleBack}>
        {t('backToConsultations', 'Back to consultations')}
      </Button>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3>{headerTitle}</h3>
          <Tag type={getStatusTagType(consultation.status)} size="md">
            {consultation.status === 'completed' ? t('completed', 'Completed') : t('pending', 'Pending')}
          </Tag>
        </div>

        <div className={styles.actions}>
          {canRespond ? (
            <Button kind="primary" disabled={isLaunching} onClick={handleRespond}>
              {isLaunching ? t('loading', 'Loading...') : t('respond', 'Respond')}
            </Button>
          ) : null}
          {consultation.status === 'completed' && canRequestConsultation ? (
            <Button kind="secondary" disabled={isLaunching} onClick={handleCreateAnotherConsultation}>
              {isLaunching ? t('loading', 'Loading...') : t('createAnotherConsultation', 'Create Another Consultation')}
            </Button>
          ) : null}
        </div>
      </div>

      <ConsultationConversationView consultation={consultation} />
    </div>
  );
};

export default ConsultationDetail;
