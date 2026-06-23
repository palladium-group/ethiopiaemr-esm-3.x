import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader, Tag } from '@carbon/react';
import { navigate, showSnackbar, useConfig } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import { useMutateOptimizedQueueEntries } from './optimized-queue-entries.resource';
import { serveQueueEntry } from './service-queues-api.resource';
import {
  formatPatientDob,
  mapCallQueueEntry,
  requeueQueueEntry,
  updateQueueEntryForCall,
  useCallQueueEntry,
} from './call-queue-entry.resource';
import styles from './call-queue-entry.modal.scss';

interface ServiceQueuesCallConfig {
  concepts: {
    defaultTransitionStatus: string;
  };
  visitQueueNumberAttributeUuid: string;
  defaultIdentifierTypes: string[];
}

interface CallQueueEntryModalProps {
  closeModal: () => void;
  queueEntry: QueueEntry;
}

const REQUEUE_COMMENT = 'Requeued';

const CallQueueEntryModal: React.FC<CallQueueEntryModalProps> = ({ closeModal, queueEntry }) => {
  const { t } = useTranslation();
  const config = useConfig<ServiceQueuesCallConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });
  const { mutateQueueEntries } = useMutateOptimizedQueueEntries();

  const { queueEntry: fullQueueEntry, isLoading, error } = useCallQueueEntry(queueEntry.uuid);

  const handleServe = useCallback(() => {
    if (!fullQueueEntry) {
      return;
    }

    const mapped = mapCallQueueEntry(fullQueueEntry, config.visitQueueNumberAttributeUuid);

    updateQueueEntryForCall(
      mapped.visitUuid,
      mapped.queueUuid,
      mapped.queueEntryUuid,
      mapped.patientUuid,
      mapped.priority?.uuid,
      config.concepts.defaultTransitionStatus,
      new Date(),
      mapped.sortWeight,
    ).then(
      () => {
        serveQueueEntry(mapped.queue.name, mapped.visitQueueNumber ?? '', 'serving').then(
          (response) => {
            if (!response.ok) {
              showSnackbar({
                title: t('queueEntryUpdateFailed', 'Error updating queue entry'),
                kind: 'error',
                isLowContrast: false,
                subtitle: response.statusText,
              });
              return;
            }
            showSnackbar({
              isLowContrast: true,
              title: t('success', 'Success'),
              kind: 'success',
              subtitle: t('patientAttendingService', 'Patient attending service'),
            });
            closeModal();
            mutateQueueEntries().catch(() => undefined);
            navigate({ to: `\${openmrsSpaBase}/patient/${mapped.patientUuid}/chart` });
          },
          (ticketError: Error) => {
            showSnackbar({
              title: t('queueEntryUpdateFailed', 'Error updating queue entry'),
              kind: 'error',
              isLowContrast: false,
              subtitle: ticketError?.message,
            });
          },
        );
      },
      (serveError: Error) => {
        showSnackbar({
          title: t('queueEntryUpdateFailed', 'Error updating queue entry'),
          kind: 'error',
          isLowContrast: false,
          subtitle: serveError?.message,
        });
      },
    );
  }, [
    closeModal,
    config.concepts.defaultTransitionStatus,
    config.visitQueueNumberAttributeUuid,
    fullQueueEntry,
    mutateQueueEntries,
    t,
  ]);

  const handleRequeue = useCallback(() => {
    if (!fullQueueEntry) {
      return;
    }

    const mapped = mapCallQueueEntry(fullQueueEntry, config.visitQueueNumberAttributeUuid);

    requeueQueueEntry(REQUEUE_COMMENT, mapped.queueUuid, mapped.queueEntryUuid).then(
      () => {
        showSnackbar({
          isLowContrast: true,
          title: t('success', 'Success'),
          kind: 'success',
          subtitle: t('patientRequeued', 'Patient has been requeued'),
        });
        closeModal();
        mutateQueueEntries().catch(() => undefined);
      },
      (requeueError: Error) => {
        showSnackbar({
          title: t('queueEntryUpdateFailed', 'Error updating queue entry'),
          kind: 'error',
          isLowContrast: false,
          subtitle: requeueError?.message,
        });
      },
    );
  }, [closeModal, config.visitQueueNumberAttributeUuid, fullQueueEntry, mutateQueueEntries, t]);

  const mappedEntry = fullQueueEntry ? mapCallQueueEntry(fullQueueEntry, config.visitQueueNumberAttributeUuid) : null;

  const preferredIdentifiers =
    mappedEntry?.identifiers?.filter((identifier) =>
      config.defaultIdentifierTypes?.includes(identifier?.identifierType?.uuid),
    ) ?? [];

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('servePatient', 'Serve patient')} />
      <ModalBody className={styles.modalBody}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <InlineLoading description={t('loading', 'Loading')} />
          </div>
        ) : error ? (
          <p className={styles.errorText}>{error.message}</p>
        ) : mappedEntry ? (
          <section>
            <p className={styles.p}>
              {t('patientName', 'Patient name')}: {mappedEntry.name}
            </p>
            {preferredIdentifiers.map((identifier) => (
              <p key={identifier.uuid} className={styles.p}>
                {identifier?.identifierType?.display}: {identifier?.identifier}
              </p>
            ))}
            <p className={styles.p}>
              {t('patientGender', 'Gender')}: {mappedEntry.patientGender}
            </p>
            <p className={styles.p}>
              {t('patientAge', 'Age')}: {mappedEntry.patientAge}
            </p>
            {fullQueueEntry ? (
              <p className={styles.p}>
                {t('dateOfBirth', 'Date of birth')}: {formatPatientDob(fullQueueEntry)}
              </p>
            ) : null}
            <div>
              {mappedEntry.identifiers?.map((identifier) => (
                <Tag key={identifier.uuid}>{identifier.display}</Tag>
              ))}
            </div>
          </section>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" disabled={isLoading || !mappedEntry} onClick={handleRequeue}>
          {t('requeue', 'Requeue')}
        </Button>
        <Button disabled={isLoading || !mappedEntry} onClick={handleServe}>
          {t('serve', 'Serve')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default CallQueueEntryModal;
