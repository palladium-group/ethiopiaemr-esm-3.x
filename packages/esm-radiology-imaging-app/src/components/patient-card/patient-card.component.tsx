import React from 'react';
import { PatientPhoto, formatDate, parseDate, age } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from './patient-card.scss';
import type { RadiologyPatient } from '../../radiology-imaging/types';
import { usePatientAllergies } from '../../resources/hooks/usePatientAllergies';

type PatientCardProps = {
  patient: RadiologyPatient;
  status?: string;
  compact?: boolean;
};

const PatientCard: React.FC<PatientCardProps> = ({ patient, status, compact = false }) => {
  const { t } = useTranslation();
  const { data: allergies } = usePatientAllergies(compact ? null : patient.uuid);

  const name = patient.person?.display ?? patient.display;
  const identifier = (patient.identifiers?.find((id) => id.preferred) ?? patient.identifiers?.[0])?.identifier;
  const gender = patient.person?.gender;
  const birthDate = patient.person?.birthdate;

  if (compact) {
    return (
      <div className={styles.compactCard}>
        <div className={styles.compactPatientInfo}>
          <div className={styles.patientName}>{name || '—'}</div>
          {identifier && (
            <div className={styles.patientIdentifier}>
              <span className={styles.identifierLabel}>MRN:</span> <span>{identifier}</span>
            </div>
          )}
        </div>
        {status && (
          <div className={styles.orderStatus}>
            <span className={styles.orderStatusLabel}>{status}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.patientCard}>
      <div className={styles.patientInfoContainer}>
        <PatientPhoto patientUuid={patient.uuid} patientName={name} />
        <div className={styles.patientMeta}>
          <div className={styles.patientName}>{name}</div>
          <div className={styles.patientIdentifier}>{identifier}</div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.patientDetails}>
        <div className={styles.patientDetail}>
          <div className={styles.detailLabel}>{t('gender', 'Gender')}</div>
          <div className={styles.detailValue}>{gender}</div>
        </div>
        <div className={styles.patientDetail}>
          <div className={styles.detailLabel}>{t('birthDate', 'Birth Date')}</div>
          <div className={styles.detailValue}>
            {birthDate ? `${formatDate(parseDate(birthDate), { time: false })} (${age(birthDate)})` : '—'}
          </div>
        </div>
      </div>

      {allergies && allergies.length > 0 && (
        <div className={styles.allergiesSection}>
          <div className={styles.allergiesHeader}>
            <svg
              className={styles.allergiesIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true">
              <path d="M10 2L1 17h18L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="10" y1="8" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="14.5" r="0.75" fill="currentColor" />
            </svg>
            <span className={styles.allergiesTitle}>{t('allergies', 'Allergies')}</span>
          </div>
          <p className={styles.allergiesList}>{allergies.join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default PatientCard;
