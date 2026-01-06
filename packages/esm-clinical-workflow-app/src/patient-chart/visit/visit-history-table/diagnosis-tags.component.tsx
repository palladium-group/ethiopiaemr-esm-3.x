import React from 'react';
import { Tag } from '@carbon/react';
import { CheckmarkFilled, Help } from '@carbon/react/icons';
import { type Diagnosis } from '@openmrs/esm-emr-api';
import styles from './diagnosis-tags.module.scss';

interface DiagnosisTagsProps {
  diagnoses: Array<Diagnosis>;
}

export const DiagnosisTags: React.FC<DiagnosisTagsProps> = ({ diagnoses = [] }) => {
  if (!diagnoses || diagnoses.length === 0) {
    return null;
  }

  return (
    <div className={styles.diagnosesText}>
      {diagnoses.map((diagnosis, index) => {
        const { uuid, display, certainty = 'PROVISIONAL', rank } = diagnosis;
        const color = rank === 1 ? 'red' : 'blue';
        const displayText = display.length > 30 ? `${display.substring(0, 30)}...` : display;
        const certaintyText = certainty === 'CONFIRMED' ? 'Confirmed' : 'Presumed';
        const fullTooltip = `${display} (${certaintyText})`;

        return (
          /* The title goes here on the wrapper */
          <div key={uuid || index} className={styles.tagWrapper} title={fullTooltip}>
            <Tag className={styles.tag} type={color}>
              <span className={styles.tagContent}>
                <span className={styles.textLabel}>{displayText}</span>
                {certainty === 'CONFIRMED' ? (
                  <CheckmarkFilled size={14} className={`${styles.tagIcon} ${styles.confirmedIcon}`} />
                ) : (
                  <Help size={14} className={`${styles.tagIcon} ${styles.presumedIcon}`} />
                )}
              </span>
            </Tag>
          </div>
        );
      })}
    </div>
  );
};
