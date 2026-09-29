import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type Obs } from '@openmrs/esm-framework';
import styles from './pathology-orders.scss';

interface RequestObservationsProps {
  observations: Array<Obs>;
  /** Concept UUIDs that belong to result forms (shown in a separate Results block). */
  resultConceptUuids?: ReadonlySet<string> | Array<string>;
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

function ObservationRows({ observations }: { observations: Array<Obs> }) {
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
}

/**
 * Visits-style label | value grid for request-form observations.
 * Result-form fields (when present on the same encounter) are listed under a separate Results heading.
 */
const RequestObservations: React.FC<RequestObservationsProps> = ({ observations, resultConceptUuids }) => {
  const { t } = useTranslation();

  const resultUuidSet = useMemo(() => {
    if (!resultConceptUuids) {
      return new Set<string>();
    }
    return resultConceptUuids instanceof Set ? resultConceptUuids : new Set(resultConceptUuids);
  }, [resultConceptUuids]);

  const { requestObs, resultObs } = useMemo(() => {
    if (!resultUuidSet.size) {
      return { requestObs: observations ?? [], resultObs: [] as Array<Obs> };
    }
    const request: Array<Obs> = [];
    const result: Array<Obs> = [];
    for (const obs of observations ?? []) {
      if (obs?.concept?.uuid && resultUuidSet.has(obs.concept.uuid)) {
        result.push(obs);
      } else {
        request.push(obs);
      }
    }
    return { requestObs: request, resultObs: result };
  }, [observations, resultUuidSet]);

  if (!observations?.length) {
    return (
      <div className={styles.observation}>
        <p>{t('noObservationsFound', 'No observations found')}</p>
      </div>
    );
  }

  return (
    <div className={styles.observationSections}>
      {requestObs.length > 0 ? <ObservationRows observations={requestObs} /> : null}
      {resultObs.length > 0 ? (
        <div className={styles.resultSection}>
          <p className={styles.resultSectionHeading}>{t('results', 'Results')}</p>
          <ObservationRows observations={resultObs} />
        </div>
      ) : null}
    </div>
  );
};

export default RequestObservations;
