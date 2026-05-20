import React from 'react';
import { useTranslation } from 'react-i18next';
import type { QueueEntry } from '../types';
import {
  findAssignedRoomName,
  getVisitQueueNumber,
  useActiveTicketAssignments,
  useServiceQueuesConfig,
} from './queue-room.resource';
import styles from './queue-table-room-column.scss';

interface QueueTableRoomColumnProps {
  queueEntry: QueueEntry;
}

/**
 * Queue table column that displays the patient's assigned queue room name.
 */
const QueueTableRoomColumn: React.FC<QueueTableRoomColumnProps> = ({ queueEntry }) => {
  const { t } = useTranslation();
  const { visitQueueNumberAttributeUuid } = useServiceQueuesConfig();
  const ticketNumber = getVisitQueueNumber(queueEntry, visitQueueNumberAttributeUuid);
  const { activeTickets, isLoading } = useActiveTicketAssignments();

  const assignedRoomName = findAssignedRoomName(ticketNumber, activeTickets);

  if (isLoading && !assignedRoomName) {
    return <span className={styles.roomCell}>...</span>;
  }

  if (assignedRoomName) {
    return <span className={styles.roomCell}>{assignedRoomName}</span>;
  }

  return <span className={styles.roomCell}>{t('noRoom', 'No room')}</span>;
};

export default QueueTableRoomColumn;
