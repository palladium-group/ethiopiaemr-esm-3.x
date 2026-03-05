import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { SkeletonText } from '@carbon/react';
import { formatDate } from '@openmrs/esm-framework';
import { CardHeader, EmptyState } from '@openmrs/esm-patient-common-lib';
import { useEncountersByVisit } from '../../../../clinical-views/hooks/useEncountersByVisit';
import styles from './visit-timeline.scss';

interface VisitTimelineProps {
  patientUuid: string;
  visitUuid: string;
}

function VisitTimeline({ patientUuid, visitUuid }: VisitTimelineProps) {
  const { t } = useTranslation();
  const { encounters, isLoading } = useEncountersByVisit(patientUuid, visitUuid);

  if (isLoading) {
    return (
      <div className={styles.visitTimeline}>
        <CardHeader title={t('timeline', 'Timeline')}>{null}</CardHeader>
        <p className={styles.timelineHeader}>
          <span>{t('encounter', 'Encounter')}</span> <span>&middot;</span>
          <span>{t('provider', 'Provider')}</span> <span>&middot;</span>{' '}
          <span>
            {t('timeStarted', 'Time started')} <span>&mdash;</span> {t('timeCompleted', 'Time completed')}{' '}
          </span>
        </p>
        <div className={styles.timelineEntries}>
          {Array.from({ length: 3 }).map((_, index) => (
            <p className={styles.timelineEntry} key={index}>
              <div className={styles.timelineDot} />
              <SkeletonText className={styles.skeleton} />
              <span>&middot;</span>
              <SkeletonText className={styles.skeleton} />
              <span>&middot;</span>
              <SkeletonText className={styles.skeleton} />
              <span>&mdash;</span>
              <SkeletonText className={styles.skeleton} />
            </p>
          ))}
          <div className={styles.timelineLine} />
        </div>
      </div>
    );
  }

  if (encounters?.length === 0) {
    return (
      <EmptyState
        displayText={t('encountersForThisVisit', 'encounters for this visit')}
        headerTitle={t('timeline', 'Timeline')}
      />
    );
  }

  return (
    <div className={styles.visitTimeline}>
      <p className={styles.timelineHeader}>
        <span>{t('encounter', 'Encounter')}</span> <span>&middot;</span>
        <span>{t('provider', 'Provider')}</span> <span>&middot;</span>
        <span>{t('timeStarted', 'Time started')}</span>
      </p>
      <div className={styles.timelineEntries}>
        {encounters?.map((encounter) => (
          <p className={styles.timelineEntry} key={encounter.uuid}>
            <div className={styles.timelineDot} />
            <span className={styles.encounterType}>{encounter.encounterType.display}</span>
            <span>&middot;</span>
            {(() => {
              const providerDisplay =
                encounter.encounterProviders?.length > 0
                  ? encounter.encounterProviders
                      .map((ep) => ep.provider?.person?.display)
                      .filter(Boolean)
                      .join(', ')
                  : (encounter as { orders?: Array<{ orderer?: { display?: string } }> }).orders?.[0]?.orderer?.display;
              return providerDisplay ? <span>{providerDisplay}</span> : <span>{t('noProvider', 'No provider')}</span>;
            })()}
            <span>&middot;</span>{' '}
            <span>
              {formatDate(new Date(encounter.encounterDatetime), {
                time: dayjs(encounter.encounterDatetime).isSame(dayjs(), 'day') ? 'for today' : true,
              })}
            </span>
          </p>
        ))}
        <div className={styles.timelineLine} />
      </div>
    </div>
  );
}

export default VisitTimeline;
