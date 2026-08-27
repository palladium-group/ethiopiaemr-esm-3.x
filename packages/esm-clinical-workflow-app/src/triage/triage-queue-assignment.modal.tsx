import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  FormGroup,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  RadioButtonSkeleton,
  Select,
  SelectItem,
  SelectSkeleton,
  Stack,
} from '@carbon/react';
import { ResponsiveWrapper, showSnackbar, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { useMutateQueueEntries, useQueueLocations, useQueues } from '../queue-room/queue-entries.resource';
import {
  getErrorMessage,
  isDuplicateQueueEntryError,
  postQueueEntry,
  queueOptionLabel,
  setAssignedQueueVisitAttribute,
  useTriageAssignmentCounts,
} from './triage-queue-assignment.resource';
import styles from './triage-queue-assignment.scss';

type ServiceQueuesConfig = {
  visitQueueNumberAttributeUuid?: string;
  concepts?: {
    defaultStatusConceptUuid?: string;
    defaultPriorityConceptUuid?: string;
    emergencyPriorityConceptUuid?: string;
  };
};

type AssignmentQueue = {
  uuid: string;
  display: string;
  name?: string;
  allowedPriorities?: Array<{ uuid: string; display: string }>;
};

interface TriageQueueAssignmentModalProps {
  activeVisit: Visit;
  triageId?: string;
  closeModal: () => void;
}

const TriageQueueAssignmentModal: React.FC<TriageQueueAssignmentModalProps> = ({
  activeVisit,
  triageId,
  closeModal,
}) => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const { assignedQueueVisitAttributeTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const serviceQueuesConfig = useConfig<ServiceQueuesConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });
  const { queueLocations, isLoading: isLoadingQueueLocations } = useQueueLocations();
  const queueLocationUuids = useMemo(
    () => queueLocations.map((location) => location.id).filter((id): id is string => Boolean(id)),
    [queueLocations],
  );
  const { byLocationUuid, isLoading: isLoadingCounts } = useTriageAssignmentCounts(triageId, queueLocationUuids);

  const [queueLocation, setQueueLocation] = useState('');
  const [queueService, setQueueService] = useState('');
  const [priority, setPriority] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { queues, isLoading: isLoadingQueues } = useQueues(queueLocation);
  const assignmentQueues = queues as AssignmentQueue[];

  const selectedQueue = useMemo(
    () => assignmentQueues.find((queue) => queue.uuid === queueService),
    [assignmentQueues, queueService],
  );
  const priorities = useMemo(() => selectedQueue?.allowedPriorities ?? [], [selectedQueue?.allowedPriorities]);

  useEffect(() => {
    if (queueLocation || !sessionLocation?.uuid || !queueLocations.length) {
      return;
    }
    const sessionIsQueueLocation = queueLocations.some((location) => location.id === sessionLocation.uuid);
    if (sessionIsQueueLocation) {
      setQueueLocation(sessionLocation.uuid);
    }
  }, [queueLocation, queueLocations, sessionLocation?.uuid]);

  useEffect(() => {
    setQueueService('');
    setPriority('');
  }, [queueLocation]);

  useEffect(() => {
    if (!priorities.length) {
      setPriority('');
      return;
    }
    const defaultPriorityUuid = serviceQueuesConfig.concepts?.defaultPriorityConceptUuid;
    const defaultPriority = priorities.find((item) => item.uuid === defaultPriorityUuid) ?? priorities[0];
    setPriority((current) => (priorities.some((item) => item.uuid === current) ? current : defaultPriority.uuid));
  }, [priorities, serviceQueuesConfig.concepts?.defaultPriorityConceptUuid]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const statusUuid = serviceQueuesConfig.concepts?.defaultStatusConceptUuid;
    const patientUuid = activeVisit?.patient?.uuid;

    if (!queueLocation || !queueService || !priority || !statusUuid || !patientUuid || !activeVisit?.uuid) {
      showSnackbar({
        title: t('incompleteForm', 'Incomplete form'),
        kind: 'error',
        subtitle: t('missingRequiredFields', 'Select a queue location, service, and priority'),
      });
      return;
    }

    setIsSubmitting(true);
    const sortWeight = priority === serviceQueuesConfig.concepts?.emergencyPriorityConceptUuid ? 1 : 0;

    try {
      await postQueueEntry(
        activeVisit.uuid,
        queueService,
        patientUuid,
        priority,
        statusUuid,
        sortWeight,
        queueLocation,
        serviceQueuesConfig.visitQueueNumberAttributeUuid,
      );
      await setAssignedQueueVisitAttribute(activeVisit, assignedQueueVisitAttributeTypeUuid, queueLocation);
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
          <ResponsiveWrapper>
            <FormGroup legendText={t('queueLocation', 'Queue location')}>
              {isLoadingQueueLocations || isLoadingCounts ? (
                <SelectSkeleton />
              ) : (
                <Select
                  id="triage-queue-location"
                  labelText=""
                  value={queueLocation}
                  onChange={(event) => setQueueLocation(event.target.value)}>
                  <SelectItem text={t('selectQueueLocation', 'Select a queue location')} value="" />
                  {queueLocations.map((location) => (
                    <SelectItem
                      key={location.id}
                      text={queueOptionLabel(location.name ?? location.id ?? '', byLocationUuid[location.id ?? ''])}
                      value={location.id ?? ''}
                    />
                  ))}
                </Select>
              )}
            </FormGroup>
          </ResponsiveWrapper>

          {queueLocation ? (
            <FormGroup legendText={t('service', 'Service')}>
              {isLoadingQueues || isLoadingCounts ? (
                <SelectSkeleton />
              ) : !assignmentQueues.length ? (
                <InlineNotification
                  kind="error"
                  lowContrast
                  subtitle={t('configureServices', 'Please configure services to continue.')}
                  title={t('noServicesConfigured', 'No services configured')}
                />
              ) : (
                <Select
                  id="triage-queue-service"
                  labelText=""
                  value={queueService}
                  onChange={(event) => setQueueService(event.target.value)}>
                  <SelectItem text={t('selectQueueService', 'Select a queue service')} value="" />
                  {assignmentQueues.map((queue) => (
                    <SelectItem key={queue.uuid} text={queue.name || queue.display} value={queue.uuid} />
                  ))}
                </Select>
              )}
            </FormGroup>
          ) : null}

          {queueLocation && queueService ? (
            <FormGroup legendText={t('priority', 'Priority')}>
              {isLoadingQueues ? (
                <RadioButtonGroup name="triage-queue-priority-skeleton">
                  <RadioButtonSkeleton />
                  <RadioButtonSkeleton />
                </RadioButtonGroup>
              ) : !priorities.length ? (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title={t('noPrioritiesForServiceTitle', 'No priorities available')}>
                  {t(
                    'noPrioritiesForService',
                    'The selected service does not have any allowed priorities. This is an error in configuration. Please contact your system administrator.',
                  )}
                </InlineNotification>
              ) : (
                <RadioButtonGroup
                  name="triage-queue-priority"
                  valueSelected={priority}
                  onChange={(uuid) => setPriority(String(uuid))}>
                  {priorities.map(({ uuid, display }) => (
                    <RadioButton key={uuid} labelText={display} value={uuid} />
                  ))}
                </RadioButtonGroup>
              )}
            </FormGroup>
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={isSubmitting} kind="primary" type="submit">
          {isSubmitting
            ? t('addingPatientToQueue', 'Adding patient to queue') + '...'
            : t('addPatientToQueue', 'Add patient to queue')}
        </Button>
      </ModalFooter>
    </Form>
  );
};

export default TriageQueueAssignmentModal;
