import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton, InlineLoading, Tile } from '@carbon/react';
import { useSession } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import ConsultationInboxList from '../consultation-inbox/consultation-inbox-list.component';
import { useConsultationsInbox } from '../hooks/useConsultationsInbox';
import { useLaunchConsultationResponseFromInbox } from '../hooks/useLaunchConsultationResponseFromInbox';
import styles from './consultation-inbox-dashboard.scss';

export default function ConsultationInboxDashboard() {
  const { t } = useTranslation();
  const session = useSession();
  const headerTitle = t('consultationInbox', 'Consultation inbox');
  const sessionLocationDisplay = session?.sessionLocation?.display;
  const { consultations, error, isLoading, isValidating, mutateConsultationsInbox, sessionLocationUuid } =
    useConsultationsInbox();
  const { isResponding, respondingEncounterUuid, launchConsultationResponse } = useLaunchConsultationResponseFromInbox({
    onConsultationSaved: () => {
      mutateConsultationsInbox();
    },
  });

  const handleRespond = useCallback(
    (consultation: NonNullable<typeof consultations>[number]) => {
      launchConsultationResponse(consultation).catch((launchError) => {
        console.error('Error launching consultation response form:', launchError);
      });
    },
    [launchConsultationResponse],
  );

  const emptyMessage = useMemo(() => {
    if (!sessionLocationUuid) {
      return t('sessionLocationRequiredForInbox', 'Select a session location to view consultation requests.');
    }

    return t('noPendingConsultations', 'There are no pending consultations for {{location}}.', {
      location: sessionLocationDisplay ?? t('yourLocation', 'your location'),
    });
  }, [sessionLocationDisplay, sessionLocationUuid, t]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <DataTableSkeleton role="progressbar" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <ErrorState error={error} headerTitle={headerTitle} />
      </div>
    );
  }

  if (!sessionLocationUuid) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <Tile className={styles.emptyState}>
          <p>{emptyMessage}</p>
        </Tile>
      </div>
    );
  }

  if (!consultations?.length) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{headerTitle}</h4>
        <Tile className={styles.emptyState}>
          <p>{emptyMessage}</p>
        </Tile>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{headerTitle}</h4>
        {sessionLocationDisplay ? <p className={styles.subtitle}>{sessionLocationDisplay}</p> : null}
      </div>
      {isValidating || isResponding ? <InlineLoading description={t('loading', 'Loading...')} /> : null}
      <ConsultationInboxList
        consultations={consultations}
        respondingEncounterUuid={respondingEncounterUuid}
        onRespond={handleRespond}
      />
      <p className={styles.summary}>
        {t('pendingConsultationCount', '{{count}} pending consultation(s)', { count: consultations.length })}
      </p>
    </div>
  );
}
