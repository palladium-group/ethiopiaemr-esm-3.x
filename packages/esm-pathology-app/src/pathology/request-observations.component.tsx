import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Obs } from '@openmrs/esm-framework';
import styles from './pathology-orders.scss';

interface RequestObservationsProps {
  observations: Array<Obs>;
}

function answerFromObs(obs: Obs): string {
  if (obs.value != null && typeof obs.value === 'object' && 'display' in obs.value) {
    return String((obs.value as { display?: string }).display || '');
  }
  if (typeof obs.value === 'string' || typeof obs.value === 'number' || typeof obs.value === 'boolean') {
    return String(obs.value);
  }
  if (obs.display) {
    const colonIndex = obs.display.indexOf(':');
    if (colonIndex !== -1) {
      return obs.display.substring(colonIndex + 1).trim();
    }
  }
  return '';
}

/**
 * Visits-style label | value grid for request-form observations.
 */
const RequestObservations: React.FC<RequestObservationsProps> = ({ observations }) => {
  const { t } = useTranslation();

  if (!observations?.length) {
    return (
      <div className={styles.observation}>
        <p>{t('noObservationsFound', 'No observations found')}</p>
      </div>
    );
  }

  return (
    <div className={styles.observation}>
      {observations.map((obs, index) => {
        if (obs.groupMembers?.length) {
          return (
            <React.Fragment key={obs.uuid || index}>
              <span className={styles.parentConcept}>{obs.concept?.display}</span>
              <span />
              {obs.groupMembers.map((member, memberIndex) => (
                <React.Fragment key={member.uuid || `${index}-${memberIndex}`}>
                  <span className={styles.childConcept}>{member.concept?.display}</span>
                  <span>{answerFromObs(member)}</span>
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={obs.uuid || index}>
            <span>{obs.concept?.display}</span>
            <span>{answerFromObs(obs)}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default RequestObservations;
