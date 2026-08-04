import React from 'react';
import { useTranslation } from 'react-i18next';
import { age, formatDate, getPatientName, parseDate, usePatient } from '@openmrs/esm-framework';
import { Idea, Notebook, View } from '@carbon/react/icons';
import ReportRenderer from './report-renderer.component';
import type { Procedure } from '../../types';
import styles from './report-expanded-content.shared.scss';

export function getGenderAbbr(gender: string | undefined): string {
  if (gender === 'male') {
    return 'M';
  }
  if (gender === 'female') {
    return 'F';
  }
  return '';
}

export function getDisplayName(field: unknown): string {
  return typeof field === 'object' && field !== null ? (field as { display: string }).display : '—';
}

export function useReportPatientData(patientUuid: string) {
  const { patient, isLoading, error } = usePatient(patientUuid);

  const mrn = patient?.identifier?.[0]?.value ?? '—';
  const birthDate = patient?.birthDate;
  const ageValue = birthDate ? age(birthDate) : null;
  const genderAbbr = getGenderAbbr(patient?.gender);
  const dobDisplay = birthDate
    ? `${formatDate(parseDate(birthDate), { time: false })} (${ageValue} ${genderAbbr})`.trim()
    : '—';

  return { patient, isLoading, error, mrn, dobDisplay };
}

interface ReportHeaderProps {
  patient: ReturnType<typeof usePatient>['patient'];
  mrn: string;
  dobDisplay: string;
  studyDate: string;
  accession: string;
  procedureName: string;
  tag: React.ReactNode;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  patient,
  mrn,
  dobDisplay,
  studyDate,
  accession,
  procedureName,
  tag,
}) => {
  const { t } = useTranslation();
  return (
    <div className={styles.headerCard}>
      <div className={styles.headerTop}>
        <div className={styles.patientInfo}>
          <p className={styles.patientName}>{patient ? getPatientName(patient) : '—'}</p>
          <div className={styles.demographics}>
            <div className={styles.demoItem}>
              <span className={styles.demoLabel}>{t('id', 'ID')}</span>
              <span className={styles.demoValue}>{mrn}</span>
            </div>
            <span className={styles.pipe}>|</span>
            <div className={styles.demoItem}>
              <span className={styles.demoLabel}>{t('dob', 'DOB')}</span>
              <span className={styles.demoValue}>{dobDisplay}</span>
            </div>
            <span className={styles.pipe}>|</span>
            <div className={styles.demoItem}>
              <span className={styles.demoLabel}>{t('studyDate', 'STUDY DATE')}</span>
              <span className={styles.demoValue}>{studyDate}</span>
            </div>
          </div>
        </div>
        <div className={styles.badgeSection}>
          {tag}
          <p className={styles.accession}>
            {t('accession', 'Accession')}: {accession}
          </p>
        </div>
      </div>
      <div className={styles.procedureSection}>
        <span className={styles.procedureLabel}>{t('procedure', 'PROCEDURE')}</span>
        <p className={styles.procedureName}>{procedureName}</p>
      </div>
    </div>
  );
};

interface ReportSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ icon, title, children }) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      {icon}
      <span className={styles.sectionTitle}>{title}</span>
    </div>
    <hr className={styles.divider} />
    {children}
  </div>
);

export const ClinicalHistorySection: React.FC<{ procedure: Procedure }> = ({ procedure }) => {
  const { t } = useTranslation();
  return (
    <ReportSection icon={<Notebook size={16} />} title={t('clinicalHistory', 'CLINICAL HISTORY')}>
      {procedure?.parentOrder?.['orderReasonNonCoded'] ? (
        <p className={styles.bodyText}>{procedure.parentOrder['orderReasonNonCoded']}</p>
      ) : (
        <p className={styles.empty}>—</p>
      )}
    </ReportSection>
  );
};

export const FindingsSection: React.FC<{ procedure: Procedure }> = ({ procedure }) => {
  const { t } = useTranslation();
  return (
    <ReportSection icon={<View size={16} />} title={t('findings', 'FINDINGS')}>
      {procedure.preliminaryReport ? (
        <ReportRenderer content={procedure.preliminaryReport} className={styles.richContent} />
      ) : (
        <p className={styles.empty}>—</p>
      )}
    </ReportSection>
  );
};

export const ImpressionBlock: React.FC<{ impressions: string }> = ({ impressions }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.impressionBlock}>
      <div className={styles.impressionHeader}>
        <Idea size={16} />
        <span className={styles.sectionTitle}>{t('impression', 'IMPRESSION')}</span>
      </div>
      <ReportRenderer content={impressions} className={styles.richContent} />
    </div>
  );
};

interface RadiologistEntryProps {
  label: string;
  name: string;
  timestamp?: string | null;
}

export const RadiologistEntry: React.FC<RadiologistEntryProps> = ({ label, name, timestamp }) => (
  <div className={styles.radiologistItem}>
    <span className={styles.radiologistLabel}>{label}</span>
    <p className={styles.radiologistName}>{name}</p>
    {timestamp && <span className={styles.radiologistTime}>{timestamp}</span>}
  </div>
);
