import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, SkeletonText, Tag, Tile } from '@carbon/react';
import { formatDatetime } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { useConsultationsByPatient } from '../hooks/useConsultationsByPatient';
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
  const { encounterUuid } = useParams<{ encounterUuid: string }>();
  const headerTitle = t('consultationDetails', 'Consultation details');
  const { consultations, error, isLoading } = useConsultationsByPatient(patient.id);
  const consultation = consultations?.find((item) => item.encounterUuid === encounterUuid);

  const handleBack = () => {
    navigate('..');
  };

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

  if (!consultation) {
    return (
      <div className={styles.container}>
        <Button kind="ghost" onClick={handleBack}>
          {t('backToConsultations', 'Back to consultations')}
        </Button>
        <Tile className={styles.placeholderTile}>
          <p>{t('consultationNotFound', 'Consultation not found.')}</p>
        </Tile>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Button kind="ghost" onClick={handleBack}>
        {t('backToConsultations', 'Back to consultations')}
      </Button>

      <div className={styles.header}>
        <h3>{headerTitle}</h3>
        <Tag type={getStatusTagType(consultation.status)} size="md">
          {consultation.status === 'completed' ? t('completed', 'Completed') : t('pending', 'Pending')}
        </Tag>
      </div>

      <Tile className={styles.placeholderTile}>
        <dl className={styles.summaryList}>
          <div>
            <dt>{t('requestedDate', 'Requested date')}</dt>
            <dd>{consultation.requestedAt ? formatDatetime(new Date(consultation.requestedAt)) : '--'}</dd>
          </div>
          <div>
            <dt>{t('consultedDepartment', 'Consulted department')}</dt>
            <dd>{consultation.consultedDepartment.display || '--'}</dd>
          </div>
          <div>
            <dt>{t('consultingDepartment', 'Consulting department')}</dt>
            <dd>{consultation.consultingDepartment || '--'}</dd>
          </div>
          <div>
            <dt>{t('requestingProvider', 'Requesting provider')}</dt>
            <dd>{consultation.requestingProvider?.display || '--'}</dd>
          </div>
          <div>
            <dt>{t('consultationType', 'Type')}</dt>
            <dd>{consultation.consultationType || '--'}</dd>
          </div>
        </dl>
        <p className={styles.comingSoon}>{t('consultationDetailComingSoon', 'Full consultation view coming soon.')}</p>
      </Tile>
    </div>
  );
};

export default ConsultationDetail;
