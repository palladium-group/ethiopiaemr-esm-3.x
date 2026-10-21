import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, SkeletonText } from '@carbon/react';
import { Renew } from '@carbon/react/icons';
import { formatDate, parseDate, showModal } from '@openmrs/esm-framework';
import { launchStartVisitPrompt } from '@openmrs/esm-patient-common-lib';
import {
  recordTypeLabel,
  usePendingRequests,
  useShrEnabled,
  useShrSummary,
  type PendingRequest,
  type ShrRefusal,
} from './shr-chart.resource';
import { SECTION_ORDER } from './shr-summary';
import ShrSectionCard from './shr-section-card.component';
import styles from './shr-dashboard.scss';

interface ShrDashboardProps {
  patientUuid?: string;
  patient?: fhir.Patient;
}

/**
 * The patient's Shared Health Record as this facility may see it, read live when the dashboard is
 * opened. Nothing is kept in this EMR.
 */
const ShrDashboard: React.FC<ShrDashboardProps> = ({ patientUuid: givenUuid, patient }) => {
  const { t } = useTranslation();
  const patientUuid = givenUuid ?? patient?.id;
  const { isEnabled, isLoading: isLoadingStatus } = useShrEnabled();
  const { summary, refusal, isLoading, isValidating, mutate } = useShrSummary(isEnabled ? patientUuid : undefined);
  const {
    pending,
    isLoading: isLoadingPending,
    mutate: mutatePending,
  } = usePendingRequests(isEnabled ? patientUuid : undefined);

  const refresh = useCallback(() => {
    mutate();
    mutatePending();
  }, [mutate, mutatePending]);

  const openRequestAccess = useCallback(() => {
    const dispose = showModal('shr-request-access-modal', {
      closeModal: () => dispose(),
      patientUuid,
      onRequested: () => mutatePending(),
    });
  }, [patientUuid, mutatePending]);

  if (isLoadingStatus) {
    return <SkeletonText paragraph lineCount={3} />;
  }
  if (!isEnabled) {
    return (
      <div className={styles.container}>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('shrNotSwitchedOn', 'The Shared Health Record is not switched on at this facility.')}
        />
      </div>
    );
  }

  const waiting = pending.length > 0;
  // A request can only be made where a treatment read could be: the module refuses it otherwise.
  // Not offered until the pending requests are known, so it does not appear beside one already
  // waiting. Should that read fail, the module still refuses a second request as request-pending.
  const mayRequest = !isLoadingPending && !waiting && (summary !== null || refusal?.code === 'consent-required');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h4 className={styles.title}>{t('sharedHealthRecord', 'Shared Health Record')}</h4>
          <p className={styles.description}>
            {t(
              'shrDescription',
              "Records other facilities have shared, as far as the patient's consent to this facility allows. Read live; nothing is stored in this EMR.",
            )}
          </p>
        </div>
        <div className={styles.actions}>
          {mayRequest && (
            <Button kind="primary" onClick={openRequestAccess}>
              {summary ? t('requestMoreAccess', 'Request more access') : t('requestAccess', 'Request access')}
            </Button>
          )}
          <Button
            kind="ghost"
            renderIcon={Renew}
            onClick={refresh}
            disabled={isValidating}
            iconDescription={t('refresh', 'Refresh')}>
            {t('refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {pending.map((request) => (
        <PendingNotice key={request.id} request={request} />
      ))}

      {isLoading ? (
        <InlineLoading description={t('readingShr', 'Reading the Shared Health Record…')} />
      ) : refusal ? (
        // While a request waits, "not shared" only repeats what the waiting notice already says.
        waiting && refusal.code === 'consent-required' ? null : (
          <RefusalNotice refusal={refusal} onRetry={refresh} onVisitStarted={refresh} />
        )
      ) : summary ? (
        <div className={styles.sections}>
          {SECTION_ORDER.map((key) => (
            <ShrSectionCard key={key} section={key} records={summary[key]} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const PendingNotice: React.FC<{ request: PendingRequest }> = ({ request }) => {
  const { t } = useTranslation();
  const types = request.resourceTypes.map((type) => recordTypeLabel(type, t)).join(', ');
  return (
    <InlineNotification
      kind="info"
      lowContrast
      hideCloseButton
      className={styles.notice}
      title={t('waitingForPatient', 'Waiting for the patient to answer')}
      subtitle={t('waitingForPatientDetail', 'Asked for {{types}} on {{sent}}. The request lapses on {{expires}}.', {
        types,
        sent: request.authoredOn ? formatDate(parseDate(request.authoredOn)) : '—',
        expires: request.expires ? formatDate(parseDate(request.expires)) : '—',
      })}
    />
  );
};

interface RefusalNoticeProps {
  refusal: ShrRefusal;
  onRetry: () => void;
  onVisitStarted: () => void;
}

const RefusalNotice: React.FC<RefusalNoticeProps> = ({ refusal, onRetry, onVisitStarted }) => {
  const { t } = useTranslation();

  switch (refusal.code) {
    case 'no-active-visit':
      return (
        <div className={styles.noticeWithAction}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            className={styles.notice}
            title={t('visitNeeded', 'A visit is needed')}
            subtitle={t('visitNeededDetail', "Start a visit to view this patient's Shared Health Record.")}
          />
          <Button kind="primary" onClick={() => launchStartVisitPrompt(onVisitStarted)}>
            {t('startVisit', 'Start visit')}
          </Button>
        </div>
      );
    case 'no-health-id':
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          className={styles.notice}
          title={t('noHealthId', 'No Health ID')}
          subtitle={t(
            'noHealthIdDetail',
            "This patient has no Health ID, so their Shared Health Record can't be looked up.",
          )}
        />
      );
    case 'consent-required':
      return (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          className={styles.notice}
          title={t('notShared', 'Not shared with this facility')}
          subtitle={t(
            'notSharedDetail',
            "The patient hasn't shared their Shared Health Record with this facility. Request access, and the patient answers from their own portal.",
          )}
        />
      );
    case 'patient-not-found':
      return (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          className={styles.notice}
          title={t('notInShr', 'Not in the Shared Health Record yet')}
          subtitle={t('notInShrDetail', 'No other facility has shared records for this patient.')}
        />
      );
    // not-authenticated is the module's own refusal; session-expired a bare 401 from OpenMRS.
    case 'not-authenticated':
    case 'session-expired':
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          className={styles.notice}
          title={t('sessionExpired', 'Your session has ended')}
          subtitle={t('sessionExpiredDetail', 'Log in again to view the Shared Health Record.')}
        />
      );
    case 'not-authorised':
    case 'feature-disabled':
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          className={styles.notice}
          title={t('noAccess', "You don't have access to the Shared Health Record")}
        />
      );
    default:
      return (
        <div className={styles.noticeWithAction}>
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            className={styles.notice}
            title={t('shrUnavailable', "The Shared Health Record can't be reached right now")}
            subtitle={refusal.code !== 'shr-unreachable' && refusal.code !== 'unknown' ? refusal.code : undefined}
          />
          <Button kind="primary" onClick={onRetry}>
            {t('tryAgain', 'Try again')}
          </Button>
        </div>
      );
  }
};

export default ShrDashboard;
