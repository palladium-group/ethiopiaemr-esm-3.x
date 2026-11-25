import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  DropdownSkeleton,
  Form,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SelectItem,
  Stack,
  TextArea,
  TimePicker,
  TimePickerSelect,
} from '@carbon/react';
import { getCoreTranslation, OpenmrsDatePicker, showSnackbar, useConfig } from '@openmrs/esm-framework';
import type { QueueEntry } from '../../types';
import { getErrorMessage, isDuplicateQueueEntryError } from '../../triage/triage-queue-assignment.resource';
import {
  isAlreadyEndedQueueEntryError,
  transitionQueueEntry,
  useMutateQueueEntries,
  useQueueEntry,
} from '../queue-entries.resource';
import {
  QueueSelectorFields,
  type QueueSelectionState,
  type ServiceQueuesModalConfig,
} from '../queue-selector/QueueSelectorFields';
import styles from '../../triage/triage-queue-assignment.scss';

const TIME_12_HOUR_PATTERN = '^(1[0-2]|0?[1-9]):[0-5][0-9]$';
type AmPm = 'AM' | 'PM';

function convertTime12to24(time: string, period: AmPm): [number, number] {
  const [rawHour = 0, minute = 0] = time.split(':').map(Number);
  const hour = period === 'PM' && rawHour !== 12 ? rawHour + 12 : period === 'AM' && rawHour === 12 ? 0 : rawHour;
  return [hour, minute];
}

interface MoveQueueEntryModalProps {
  queueEntry: QueueEntry;
  closeModal: () => void;
}

const MoveQueueEntryForm: React.FC<{ freshEntry: QueueEntry; closeModal: () => void }> = ({
  freshEntry,
  closeModal,
}) => {
  const { t } = useTranslation();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const serviceQueuesConfig = useConfig<ServiceQueuesModalConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  const [selection, setSelection] = useState<QueueSelectionState>({
    priority: freshEntry.priority?.uuid ?? '',
    isEmergencyPrioritySelected: false,
    queueLocation: freshEntry.queue?.location?.uuid ?? '',
    queueService: freshEntry.queue?.uuid ?? '',
  });
  const [priorityComment, setPriorityComment] = useState(freshEntry.priorityComment ?? '');
  const [modifyTransitionTime, setModifyTransitionTime] = useState(false);
  const [transitionDate, setTransitionDate] = useState(() => new Date());
  const [transitionTime, setTransitionTime] = useState(() => dayjs().format('hh:mm'));
  const [transitionTimeFormat, setTransitionTimeFormat] = useState<AmPm>(() => (dayjs().hour() < 12 ? 'AM' : 'PM'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<{ title?: string; message: string } | null>(null);

  const allowedStatuses = selection.selectedQueue?.allowedStatuses ?? [];
  const defaultStatusUuid = serviceQueuesConfig.concepts?.defaultStatusConceptUuid;
  const newStatus =
    allowedStatuses.find((status) => status.uuid === defaultStatusUuid)?.uuid ??
    allowedStatuses[0]?.uuid ??
    freshEntry.status?.uuid;

  const transitionDateTime = useMemo(() => {
    const startAtDate = new Date(transitionDate);
    const [hour, minute] = convertTime12to24(transitionTime, transitionTimeFormat);
    startAtDate.setHours(hour, minute, 0, 0);
    return startAtDate;
  }, [transitionDate, transitionTime, transitionTimeFormat]);

  const timeInvalidMessage = useMemo(() => {
    if (!modifyTransitionTime) {
      return null;
    }
    if (transitionDateTime > new Date()) {
      return t('timeCannotBeInFuture', 'Time cannot be in the future');
    }

    const previousStartStr = freshEntry.previousQueueEntry?.startedAt;
    const previousStart = previousStartStr ? new Date(previousStartStr) : null;
    if (previousStart && transitionDateTime <= previousStart) {
      return t(
        'timeCannotBePriorToPreviousQueueEntry',
        'Time cannot be before start of previous queue entry: {{time}}',
        {
          time: previousStart.toLocaleString(),
          interpolation: { escapeValue: false },
        },
      );
    }

    return null;
  }, [freshEntry.previousQueueEntry?.startedAt, modifyTransitionTime, t, transitionDateTime]);

  const isUnchanged =
    selection.queueService === freshEntry.queue?.uuid &&
    newStatus === freshEntry.status?.uuid &&
    selection.priority === freshEntry.priority?.uuid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selection.queueLocation || !selection.queueService || !selection.priority || !newStatus) {
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const response = await transitionQueueEntry({
        queueEntryToTransition: freshEntry.uuid,
        newQueue: selection.queueService,
        newStatus,
        newPriority: selection.priority,
        newPriorityComment: priorityComment,
        ...(modifyTransitionTime ? { transitionDate: transitionDateTime.toISOString() } : {}),
      });

      if (response.status !== 200) {
        throw new Error(t('unexpectedServerResponse', 'Unexpected Server Response'));
      }

      showSnackbar({
        isLowContrast: true,
        title: t('queueEntryTransitioned', 'Queue entry transitioned'),
        kind: 'success',
        subtitle: t('queueEntryTransitionedSuccessfully', 'Queue entry transitioned successfully'),
      });
      mutateQueueEntries();
      closeModal();
    } catch (error) {
      if (isAlreadyEndedQueueEntryError(error)) {
        showSnackbar({
          title: t('queueEntryAlreadyEnded', 'Queue entry is no longer active'),
          kind: 'warning',
          subtitle: t(
            'queueEntryAlreadyEndedMessage',
            'This queue entry has already been completed by another user. The queue has been refreshed.',
          ),
        });
        mutateQueueEntries();
        closeModal();
      } else if (isDuplicateQueueEntryError(error)) {
        setSubmissionError({
          title: t('patientAlreadyInQueue', 'Patient already in queue'),
          message: t('duplicateQueueEntry', 'This patient is already in the selected queue.'),
        });
      } else {
        setSubmissionError({
          title: t('queueEntryTransitionFailed', 'Error transitioning queue entry'),
          message: getErrorMessage(error) || t('unknownError', 'An unknown error occurred'),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <ModalHeader
        closeModal={closeModal}
        title={t('movePatient', 'Move {{patient}}', { patient: freshEntry.display })}
      />
      <ModalBody className={styles.modalBody}>
        <Stack gap={5}>
          <QueueSelectorFields
            idPrefix="move-queue"
            initialPriorityUuid={freshEntry.priority?.uuid}
            initialLocationUuid={freshEntry.queue?.location?.uuid}
            initialQueueUuid={freshEntry.queue?.uuid}
            currentQueueUuid={freshEntry.queue?.uuid}
            onChange={setSelection}
          />

          <TextArea
            id="move-queue-priority-comment"
            labelText={t('comment', 'Comment')}
            value={priorityComment}
            onChange={(e) => setPriorityComment(e.target.value)}
            placeholder={t('enterCommentHere', 'Enter comment here')}
          />

          <div>
            <Checkbox
              labelText={t('now', 'Now')}
              id="move-queue-modify-transition-time"
              checked={!modifyTransitionTime}
              onChange={(_, { checked }) => setModifyTransitionTime(!checked)}
            />
            {modifyTransitionTime && (
              <div className={styles.dateTimeFields}>
                <OpenmrsDatePicker
                  data-testid="move-queue-transition-date"
                  id="move-queue-transition-date"
                  labelText={t('date', 'Date')}
                  maxDate={new Date()}
                  onChange={(date) => setTransitionDate(date instanceof Date ? date : new Date(date))}
                  value={transitionDate}
                />
                <TimePicker
                  id="move-queue-transition-time"
                  labelText={t('time', 'Time')}
                  onChange={(event) => setTransitionTime(event.target.value)}
                  pattern={TIME_12_HOUR_PATTERN}
                  value={transitionTime}
                  invalid={timeInvalidMessage !== null}
                  invalidText={timeInvalidMessage}>
                  <TimePickerSelect
                    id="move-queue-transition-time-format"
                    onChange={(event) => setTransitionTimeFormat(event.target.value as AmPm)}
                    value={transitionTimeFormat}
                    aria-label={t('time', 'Time')}>
                    <SelectItem value="AM" text="AM" />
                    <SelectItem value="PM" text="PM" />
                  </TimePickerSelect>
                </TimePicker>
              </div>
            )}
          </div>

          {submissionError && (
            <InlineNotification
              kind="error"
              lowContrast={false}
              title={submissionError.title || t('queueEntryTransitionFailed', 'Error transitioning queue entry')}
              subtitle={submissionError.message}
              onClose={() => setSubmissionError(null)}
            />
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button
          disabled={
            isSubmitting ||
            !selection.queueLocation ||
            !selection.queueService ||
            !selection.priority ||
            !newStatus ||
            isUnchanged ||
            timeInvalidMessage !== null
          }
          kind="primary"
          type="submit">
          {t('move', 'Move')}
        </Button>
      </ModalFooter>
    </Form>
  );
};

export const MoveQueueEntryModal: React.FC<MoveQueueEntryModalProps> = ({ queueEntry, closeModal }) => {
  const { t } = useTranslation();
  const { queueEntry: freshEntry, error, isLoading } = useQueueEntry(queueEntry.uuid);
  const { mutateQueueEntries } = useMutateQueueEntries();
  const isEnded = !isLoading && !error && (!freshEntry || Boolean(freshEntry.endedAt));

  useEffect(() => {
    if (isEnded) {
      mutateQueueEntries();
    }
  }, [isEnded, mutateQueueEntries]);

  const title = t('movePatient', 'Move {{patient}}', { patient: queueEntry.display });

  if (isLoading || error || isEnded) {
    return (
      <>
        <ModalHeader closeModal={closeModal} title={title} />
        <ModalBody>
          {isLoading ? (
            <DropdownSkeleton data-testid="move-queue-entry-loading-skeleton" />
          ) : (
            <InlineNotification
              hideCloseButton
              kind={error ? 'error' : 'warning'}
              lowContrast
              title={
                error
                  ? t('errorLoadingQueueEntry', 'Error loading queue entry')
                  : t('queueEntryAlreadyEnded', 'Queue entry is no longer active')
              }
              subtitle={
                error
                  ? error?.message || t('unexpectedError', 'An unexpected error occurred')
                  : t(
                      'queueEntryAlreadyEndedMessage',
                      'This queue entry has already been completed by another user. The queue has been refreshed.',
                    )
              }
            />
          )}
        </ModalBody>
        {!isLoading && (
          <ModalFooter>
            <Button kind="secondary" onClick={closeModal}>
              {getCoreTranslation('close')}
            </Button>
          </ModalFooter>
        )}
      </>
    );
  }

  return <MoveQueueEntryForm freshEntry={freshEntry} closeModal={closeModal} />;
};

export default MoveQueueEntryModal;
