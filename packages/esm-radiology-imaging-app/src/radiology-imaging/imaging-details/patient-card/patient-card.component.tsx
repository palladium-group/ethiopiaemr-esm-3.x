import React from 'react';
import {
  usePatient,
  PatientPhoto,
  getPatientName,
  formatDate,
  parseDate,
  age,
  ErrorCard,
} from '@openmrs/esm-framework';
import styles from './patient-card.scss';
import { useTranslation } from 'react-i18next';
import { SkeletonText } from '@carbon/react';

type PatientCardProps = {
  patientUuid: string;
};

const PatientCard: React.FC<PatientCardProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { patient, isLoading: isPatientLoading, error: patientError } = usePatient(patientUuid);

  if (isPatientLoading) {
    return <SkeletonText paragraph lineCount={4} />;
  }

  if (patientError) {
    return <ErrorCard error={patientError} headerTitle={t('errorLoadingPatient', 'Error loading patient')} />;
  }

  if (!patient) {
    return <p>{t('patientNotFound', 'Patient not found')}</p>;
  }

  return (
    <div className={styles.patientCard}>
      <div className={styles.patientInfoContainer}>
        <PatientPhoto patientUuid={patientUuid} patientName={getPatientName(patient)} />
        <div className={styles.patientInfo}>
          <div className={styles.patientName}>{getPatientName(patient)}</div>
          <div className={styles.patientIdentifier}>{patient.identifier?.[0]?.value}</div>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.patientDetails}>
        <div className={styles.patientDetail}>
          <div className={styles.patientDetailLabel}>{t('gender', 'Gender')}</div>
          <div className={styles.patientDetailValue}>{patient.gender}</div>
        </div>
        <div className={styles.patientDetail}>
          <div className={styles.patientDetailLabel}>{t('birthDate', 'Birth Date')}</div>
          <div className={styles.patientDetailValue}>
            {formatDate(parseDate(patient.birthDate ?? ''), { time: false })} ({age(patient.birthDate ?? '')})
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;
