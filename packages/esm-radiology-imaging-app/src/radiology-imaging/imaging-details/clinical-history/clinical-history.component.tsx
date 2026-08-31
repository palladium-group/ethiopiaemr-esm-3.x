import React from 'react';
import styles from './clinical-history.scss';
import { useTranslation } from 'react-i18next';
import { Chat, Notebook, RecentlyViewed, UserAvatar } from '@carbon/react/icons';
import { type RadiologyOrder } from '../../types';
import { RenalWarningForOrder } from '../lab-results/renal-lab.component';

type ClinicalHistoryProps = {
  order: RadiologyOrder;
};

type NoteEntryProps = {
  icon: React.ReactNode;
  label: string;
  text: string;
  variant: 'comment' | 'instructions';
};

const NoteEntry: React.FC<NoteEntryProps> = ({ icon, label, text, variant }) => (
  <div className={`${styles.noteEntry} ${styles[variant]}`}>
    <span className={styles.noteLabel}>
      {icon}
      {label}
    </span>
    <p className={styles.noteText}>{text}</p>
  </div>
);

const ClinicalHistory: React.FC<ClinicalHistoryProps> = ({ order }) => {
  const { t } = useTranslation();

  const notes = [
    order?.commentToFulfiller
      ? {
          key: 'commentToFulfiller',
          variant: 'comment' as const,
          icon: <Chat size={12} />,
          label: t('commentToFulfiller', 'Comment to Fulfiller'),
          text: order.commentToFulfiller,
        }
      : null,
    order?.instructions
      ? {
          key: 'instructions',
          variant: 'instructions' as const,
          icon: <Notebook size={12} />,
          label: t('instructions', 'Instructions'),
          text: order.instructions,
        }
      : null,
  ].filter(
    (
      n,
    ): n is {
      key: string;
      variant: 'comment' | 'instructions';
      icon: React.JSX.Element;
      label: string;
      text: string;
    } => n !== null,
  );

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <RecentlyViewed />
        {t('clinicalHistory', 'Clinical History')}
      </div>

      <div className={styles.content}>
        <p className={styles.label}>{t('reasonForStudy', 'Reason for Study')}</p>
        <p className={styles.value}>{order?.orderReason?.display ?? order?.orderReasonNonCoded}</p>
      </div>
      <div className={styles.clinicalHistoryContent}>
        <div className={styles.leftColumn}>
          <div className={styles.content}>
            <p className={styles.label}>{t('referringPhysician', 'Referring Physician')}</p>
            <p className={styles.referringPhysician}>
              <UserAvatar />
              {order?.orderer?.display}
            </p>
          </div>
          {notes.length > 0 && (
            <div className={styles.notesSection}>
              {notes.map(({ key, variant, icon, label, text }) => (
                <NoteEntry key={key} variant={variant} icon={icon} label={label} text={text} />
              ))}
            </div>
          )}
        </div>
        <div className={styles.content}>
          <p className={styles.label}>{t('relevantLabResults', 'Relevant Lab Results')}</p>
          <RenalWarningForOrder
            conceptUuid={order?.concept?.uuid}
            patientUuid={order?.patient?.uuid}
            radiologyOrderDateActivated={order?.dateActivated}
          />
        </div>
      </div>
    </div>
  );
};

export default ClinicalHistory;
