import React from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showModal } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import {
  findAssignedRoomName,
  getVisitQueueNumber,
  useActiveTicketAssignments,
  useServiceQueuesConfig,
} from './queue-room.resource';

interface QueueTableRoomActionMenuProps {
  queueEntry: QueueEntry;
}

const QueueTableRoomActionMenu: React.FC<QueueTableRoomActionMenuProps> = ({ queueEntry }) => {
  const { t } = useTranslation();
  const { visitQueueNumberAttributeUuid } = useServiceQueuesConfig();
  const ticketNumber = getVisitQueueNumber(queueEntry, visitQueueNumberAttributeUuid);
  const { activeTickets } = useActiveTicketAssignments();
  const assignedRoomName = findAssignedRoomName(ticketNumber, activeTickets);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const dispose = showModal('assign-queue-room-modal', {
      queueEntry,
      closeModal: () => dispose(),
    });
  };

  return (
    <OverflowMenuItem
      itemText={assignedRoomName ? t('changeRoom', 'Change room') : t('assignRoom', 'Assign room')}
      onClick={handleClick}
    />
  );
};

export default QueueTableRoomActionMenu;
