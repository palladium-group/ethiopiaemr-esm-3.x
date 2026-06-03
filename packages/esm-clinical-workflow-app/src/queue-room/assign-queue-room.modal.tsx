import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, ModalBody, ModalFooter, ModalHeader, Tag } from '@carbon/react';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import {
  assignPatientToQueueRoom,
  findAssignedRoomName,
  getVisitQueueNumber,
  useActiveTicketAssignments,
  useQueueRooms,
  useServiceQueuesConfig,
} from './queue-room.resource';
import styles from './assign-queue-room.scss';

interface AssignQueueRoomModalProps {
  queueEntry: QueueEntry;
  closeModal: () => void;
}

const AssignQueueRoomModal: React.FC<AssignQueueRoomModalProps> = ({ queueEntry, closeModal }) => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { visitQueueNumberAttributeUuid } = useServiceQueuesConfig();
  const ticketNumber = getVisitQueueNumber(queueEntry, visitQueueNumberAttributeUuid);
  const queueUuid = queueEntry.queue?.uuid;
  const locationUuid = queueEntry.queue?.location?.uuid ?? sessionLocation?.uuid;

  const { activeTickets, mutate: mutateActiveTickets } = useActiveTicketAssignments();
  const { queueRooms, isLoading: isLoadingRooms } = useQueueRooms(queueUuid, locationUuid);

  const currentRoomName = findAssignedRoomName(ticketNumber, activeTickets);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(currentRoomName ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roomItems = queueRooms.map((room) => ({
    id: room.uuid,
    name: room.name,
  }));

  const handleSubmit = async () => {
    if (!ticketNumber) {
      showSnackbar({
        title: t('queueNumberMissing', 'Queue number missing'),
        kind: 'error',
        subtitle: t(
          'queueNumberMissingDescription',
          'This patient does not have a queue number. Assign a queue number before assigning a room.',
        ),
        isLowContrast: false,
      });
      return;
    }

    if (!selectedRoomName) {
      showSnackbar({
        title: t('queueRoomRequired', 'Queue room required'),
        kind: 'error',
        subtitle: t('queueRoomRequiredDescription', 'Please select a queue room.'),
        isLowContrast: false,
      });
      return;
    }

    if (selectedRoomName === currentRoomName) {
      closeModal();
      return;
    }

    setIsSubmitting(true);
    try {
      await assignPatientToQueueRoom(selectedRoomName, ticketNumber, 'waiting');
      await mutateActiveTickets();
      showSnackbar({
        title: currentRoomName
          ? t('patientTransferredRoom', 'Patient transferred to room')
          : t('patientAssignedRoom', 'Patient assigned to room'),
        kind: 'success',
        subtitle: t('patientAssignedRoomSuccess', '{{patient}} is now assigned to {{room}}.', {
          patient: queueEntry.display ?? queueEntry.patient?.display,
          room: selectedRoomName,
        }),
        isLowContrast: true,
      });
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('queueRoomAssignmentFailed', 'Room assignment failed'),
        kind: 'error',
        subtitle: error instanceof Error ? error.message : t('unexpectedError', 'An unexpected error occurred'),
        isLowContrast: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoom = roomItems.find((item) => item.name === selectedRoomName) ?? null;
  const roomDropdownLabel =
    selectedRoom?.name ?? (isLoadingRooms ? t('loading', 'Loading...') : t('selectQueueRoom', 'Select queue room'));

  return (
    <div className={styles.modal} data-floating-menu-container>
      <ModalHeader
        closeModal={closeModal}
        title={
          currentRoomName
            ? t('transferQueueRoom', 'Transfer to another room')
            : t('assignQueueRoom', 'Assign to queue room')
        }
      />
      <ModalBody className={styles.modalBody}>
        <div className={styles.body}>
          <p className={styles.patientName}>
            {t('patientName', 'Patient name')}: {queueEntry.display ?? queueEntry.patient?.display}
          </p>
          {ticketNumber && (
            <p>
              {t('queueNumber', 'Queue number')}: {ticketNumber}
            </p>
          )}
          {currentRoomName ? (
            <p>
              {t('currentRoom', 'Current room')}: <Tag type="blue">{currentRoomName}</Tag>
            </p>
          ) : (
            <p>{t('notAssignedToRoom', 'Not currently assigned to a room')}</p>
          )}
          {!ticketNumber && (
            <p className={styles.errorText}>
              {t(
                'queueNumberMissingDescription',
                'This patient does not have a queue number. Assign a queue number before assigning a room.',
              )}
            </p>
          )}
          {!locationUuid && (
            <p className={styles.errorText}>
              {t('queueLocationMissing', 'Unable to load rooms because the queue location is not configured.')}
            </p>
          )}
          <Dropdown
            id="queue-room-select"
            className={styles.roomDropdown}
            titleText={t('selectQueueRoom', 'Select queue room')}
            label={roomDropdownLabel}
            items={roomItems}
            itemToString={(item) => item?.name ?? ''}
            selectedItem={selectedRoom}
            onChange={({ selectedItem }) => setSelectedRoomName(selectedItem?.name ?? null)}
            disabled={isLoadingRooms || !ticketNumber || !locationUuid || roomItems.length === 0}
          />
          {!isLoadingRooms && roomItems.length === 0 && locationUuid && (
            <p className={styles.errorText}>
              {t(
                'noQueueRoomsConfigured',
                'No queue rooms are configured for this queue. Create rooms in queue admin.',
              )}
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleSubmit} disabled={isSubmitting || !ticketNumber}>
          {currentRoomName ? t('transferRoom', 'Transfer room') : t('assignRoom', 'Assign room')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default AssignQueueRoomModal;
