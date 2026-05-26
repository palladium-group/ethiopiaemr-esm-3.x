import React, { useCallback, useState } from 'react';
import { InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig, useVisit } from '@openmrs/esm-framework';
import { useMutateQueueEntries } from '../queue-room/queue-entries.resource';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { finishQueueService, isFinishedServiceStatus, useActiveQueueEntry } from './finish-service.resource';
import styles from './finish-service-button.scss';

interface FinishServiceButtonProps {
  patientUuid: string;
  renderedFrom: string;
}

const FinishServiceButton: React.FC<FinishServiceButtonProps> = ({ patientUuid, renderedFrom }) => {
  const { t } = useTranslation();
  const { finishedServiceQueueStatusUuid } = useConfig<ClinicalWorkflowConfig>();
  const { activeVisit } = useVisit(patientUuid);
  const { queueEntry, isLoading, mutate } = useActiveQueueEntry(
    patientUuid,
    finishedServiceQueueStatusUuid,
    activeVisit?.uuid,
  );
  const { mutateQueueEntries } = useMutateQueueEntries();
  const isAlreadyFinished = isFinishedServiceStatus(queueEntry, finishedServiceQueueStatusUuid);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinishService = useCallback(async () => {
    if (!queueEntry) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await finishQueueService(queueEntry, finishedServiceQueueStatusUuid);
      if (response.status !== 200) {
        throw new Error(t('unexpectedServerResponse', 'Unexpected Server Response'));
      }

      showSnackbar({
        isLowContrast: true,
        title: t('queueEntryTransitioned', 'Queue entry transitioned'),
        kind: 'success',
        subtitle: t('queueEntryTransitionedSuccessfully', 'Queue entry transitioned successfully'),
      });
      await Promise.all([mutateQueueEntries(), mutate()]);
    } catch (error) {
      const message =
        error?.responseBody?.error?.message || error?.message || t('unknownError', 'An unknown error occurred');
      showSnackbar({
        isLowContrast: true,
        title: t('queueEntryTransitionFailed', 'Error transitioning queue entry'),
        kind: 'error',
        subtitle: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [finishedServiceQueueStatusUuid, mutate, mutateQueueEntries, queueEntry, t]);

  if (renderedFrom !== 'patient-chart') {
    return null;
  }

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  if (!queueEntry || isAlreadyFinished) {
    return null;
  }

  return (
    <span className={styles.finishServiceLinkWrapper}>
      <button type="button" className={styles.finishServiceLink} disabled={isSubmitting} onClick={handleFinishService}>
        {isSubmitting ? t('finishingService', 'Finishing...') : t('finishService', 'Finish service')}
      </button>
    </span>
  );
};

export default FinishServiceButton;
