import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SkeletonText } from '@carbon/react';
import { type Obs, useConfig } from '@openmrs/esm-framework';
import { type Form } from '@openmrs/esm-patient-common-lib';
import { useFormSchema } from './useFormSchema';
import styles from './styles.scss';

interface EncounterObservationsProps {
  observations: Array<Obs>;
  form?: Form;
}

const EncounterObservations: React.FC<EncounterObservationsProps> = ({ observations, form }) => {
  const { t } = useTranslation();
  const { obsConceptUuidsToHide = [] } = useConfig();
  const { conceptToLabelMap, answerToLabelMap, fieldOrder, isLoading: isLoadingSchema } = useFormSchema(form);

  function getAnswerFromDisplay(display: string): string {
    const colonIndex = display.indexOf(':');
    if (colonIndex === -1) {
      return '';
    } else {
      return display.substring(colonIndex + 1).trim();
    }
  }

  function getLabel(conceptUuid: string, defaultDisplay: string): string {
    return conceptToLabelMap.get(conceptUuid) || defaultDisplay;
  }

  function getAnswerLabel(obs: Obs): string {
    if (obs.value && typeof obs.value === 'object' && 'uuid' in obs.value) {
      // It is a coded answer
      const key = `${obs.concept.uuid}:${obs.value.uuid}`;
      return answerToLabelMap.get(key) || getAnswerFromDisplay(obs.display);
    }
    return getAnswerFromDisplay(obs.display);
  }

  const filteredObservations = !!obsConceptUuidsToHide.length
    ? observations?.filter((obs) => {
        return !obsConceptUuidsToHide.includes(obs?.concept?.uuid);
      })
    : observations;

  const sortedObservations = useMemo(() => {
    if (!filteredObservations) {
      return [];
    }
    if (!fieldOrder || fieldOrder.length === 0) {
      return filteredObservations;
    }

    return [...filteredObservations].sort((a, b) => {
      const indexA = fieldOrder.indexOf(a.concept.uuid);
      const indexB = fieldOrder.indexOf(b.concept.uuid);

      if (indexA === -1 && indexB === -1) {
        return 0;
      }
      if (indexA === -1) {
        return 1;
      }
      if (indexB === -1) {
        return -1;
      }

      return indexA - indexB;
    });
  }, [filteredObservations, fieldOrder]);

  if (isLoadingSchema) {
    return <SkeletonText />;
  }

  if (!sortedObservations || sortedObservations.length === 0) {
    return (
      <div className={styles.observation}>
        <p>{t('noObservationsFound', 'No observations found')}</p>
      </div>
    );
  }

  return (
    <div className={styles.observation}>
      {sortedObservations?.map((obs, index) => {
        if (obs.groupMembers) {
          return (
            <React.Fragment key={index}>
              <span className={styles.parentConcept}>{getLabel(obs.concept.uuid, obs.concept.display)}</span>
              <span />
              {obs.groupMembers.map((member, memberIndex) => (
                <React.Fragment key={`${index}-${memberIndex}`}>
                  <span className={styles.childConcept}>{getLabel(member.concept.uuid, member.concept.display)}</span>
                  <span>{getAnswerLabel(member)}</span>
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={index}>
              <span>{getLabel(obs.concept.uuid, obs.concept.display)}</span>
              <span>{getAnswerLabel(obs)}</span>
            </React.Fragment>
          );
        }
      })}
    </div>
  );
};

export default EncounterObservations;
