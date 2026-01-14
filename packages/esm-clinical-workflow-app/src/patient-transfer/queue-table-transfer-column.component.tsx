import React from 'react';
import { Button, Tag } from '@carbon/react';
import { showModal } from '@openmrs/esm-framework';
import { useTransferData } from './transfer-data.resource';
import type { QueueEntry } from '../types';

interface QueueTableTransferColumnProps {
  queueEntry: QueueEntry;
}

/**
 * Queue table column component that displays transfer status
 * and allows viewing transfer details in a modal
 */
const QueueTableTransferColumn: React.FC<QueueTableTransferColumnProps> = ({ queueEntry }) => {
  const { transferData, isLoading } = useTransferData(queueEntry.visit?.uuid, queueEntry.patient?.uuid);

  if (isLoading) {
    return <span>...</span>;
  }

  if (!transferData) {
    return <Tag type="gray">No Transfer</Tag>;
  }

  const handleViewTransfer = () => {
    const dispose = showModal('patient-transfer-details-modal', {
      transferData,
      closeModal: () => dispose(),
    });
  };

  return (
    <Button kind="ghost" size="sm" onClick={handleViewTransfer}>
      View Transfer
    </Button>
  );
};

export default QueueTableTransferColumn;
