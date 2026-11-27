import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DropdownSkeleton,
  Form,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
} from '@carbon/react';
import { showSnackbar, useConfig, type Visit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import {
  getErrorMessage,
  isDuplicateQueueEntryError,
  postQueueEntry,
  setAssignedQueueVisitAttribute,
} from '../../triage/triage-queue-assignment.resource';
import { useLatestQueueEntry, useMutateQueueEntries } from '../queue-entries.resource';
import {
  QueueSelectorFields,
  type QueueSelectionState,
  type ServiceQueuesModalConfig,
} from '../queue-selector/QueueSelectorFields';
import MoveQueueEntryModal from './move-queue-entry.modal';
import styles from '../../triage/triage-queue-assignment.scss';

interface TransitionPatientToLatestQueueModalProps {
  activeVisit: Visit;
  closeModal: () => void;
}

const AddPatientToQueueForm: React.FC<TransitionPatientToLatestQueueModalProps> = ({ activeVisit, closeModal }) => {
  const { t } = useTranslation();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const { assignedQueueVisitAttributeTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const serviceQueuesConfig = useConfig<ServiceQueuesModalConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  const [selection, setSelection] = useState<QueueSelectionState>({
    priority: '',
    isEmergencyPrioritySelected: false,
    queueLocation: '',
    queueService: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const statusUuid = serviceQueuesConfig.concepts?.defaultStatusConceptUuid;
    const patientUuid = activeVisit?.patient?.uuid;

    if (
      !selection.queueLocation ||
      !selection.queueService ||
      !selection.priority ||
      !statusUuid ||
      !patientUuid ||
      !activeVisit?.uuid
    ) {
      showSnackbar({
        title: t('incompleteForm', 'Incomplete form'),
        kind: 'error',
        subtitle: t('missingRequiredFields', 'Select a queue location, service, and priority'),
      });
      return;
    }

    setIsSubmitting(true);
    const sortWeight = selection.isEmergencyPrioritySelected ? 1 : 0;

    try {
      await postQueueEntry(
        activeVisit.uuid,
        selection.queueService,
        patientUuid,
        selection.priority,
        statusUuid,
        sortWeight,
        selection.queueLocation,
        serviceQueuesConfig.visitQueueNumberAttributeUuid,
      );
      await setAssignedQueueVisitAttribute(activeVisit, assignedQueueVisitAttributeTypeUuid, selection.queueLocation);
      mutateQueueEntries();
      showSnackbar({
        kind: 'success',
        isLowContrast: true,
        title: t('addedPatientToQueue', 'Added patient to queue'),
        subtitle: t('queueEntryAddedSuccessfully', 'Queue entry added successfully'),
      });
      closeModal();
    } catch (error) {
      if (isDuplicateQueueEntryError(error)) {
        showSnackbar({
          title: t('patientAlreadyInQueue', 'Patient already in queue'),
          kind: 'warning',
          subtitle: t('duplicateQueueEntry', 'This patient is already in the selected queue.'),
        });
      } else {
        showSnackbar({
          title: t('queueEntryError', 'Error adding patient to the queue'),
          kind: 'error',
          subtitle: getErrorMessage(error),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <ModalHeader closeModal={closeModal} title={t('addPatientToQueue', 'Add patient to queue')} />
      <ModalBody className={styles.modalBody}>
        <Stack gap={5}>
          <QueueSelectorFields idPrefix="transition-latest-queue" onChange={setSelection} />
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          disabled={isSubmitting || !selection.queueLocation || !selection.queueService || !selection.priority}
          kind="primary"
          type="submit">
          {isSubmitting
            ? t('addingPatientToQueue', 'Adding patient to queue') + '...'
            : t('addPatientToQueue', 'Add patient to queue')}
        </Button>
      </ModalFooter>
    </Form>
  );
};

export const TransitionPatientToLatestQueueModal: React.FC<TransitionPatientToLatestQueueModalProps> = ({
  activeVisit,
  closeModal,
}) => {
  const { t } = useTranslation();
  const { data: queueEntry, isLoading, error } = useLatestQueueEntry(activeVisit?.patient?.uuid);

  if (isLoading || error) {
    return (
      <>
        <ModalHeader closeModal={closeModal} title={t('addPatientToQueue', 'Add patient to queue')} />
        <ModalBody>
          {isLoading ? (
            <DropdownSkeleton />
          ) : (
            <InlineNotification
              kind="error"
              title={t('errorLoadingQueueEntry', 'Error loading queue entry')}
              subtitle={error?.message || t('unexpectedError', 'An unexpected error occurred')}
              lowContrast
            />
          )}
        </ModalBody>
      </>
    );
  }

  if (queueEntry) {
    return <MoveQueueEntryModal queueEntry={queueEntry} closeModal={closeModal} />;
  }

  return <AddPatientToQueueForm activeVisit={activeVisit} closeModal={closeModal} />;
};

export default TransitionPatientToLatestQueueModal;
