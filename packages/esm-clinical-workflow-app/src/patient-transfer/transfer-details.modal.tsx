import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModalBody, ModalHeader, Button, ModalFooter } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import type { TransferData } from './transfer-data.resource';
import type { QueueEntry } from '../types';
import { launchTransferAppointmentWorkspace } from './launch-transfer-appointment.resource';
import styles from './transfer-details.scss';

interface TransferDetailsModalProps {
  transferData: TransferData;
  queueEntry: QueueEntry;
  closeModal: () => void;
}

const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({ transferData, queueEntry, closeModal }) => {
  const { t } = useTranslation();

  const handleAppointPatient = () => {
    const patientUuid = queueEntry.patient?.uuid;
    if (!patientUuid) {
      return;
    }

    closeModal();
    launchTransferAppointmentWorkspace(patientUuid, queueEntry.uuid);
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('patientTransferInformation', 'Patient Linkage Information')} />
      <ModalBody>
        <div className={styles.container}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('linkageDate', 'Linkage Date')}:</strong>{' '}
            {formatDate(parseDate(transferData.transferDate), { mode: 'wide' })}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('fromLocation', 'Linked From')}:</strong> {transferData.fromLocation}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('toLocation', 'Linked To')}:</strong> {transferData.toLocation}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('linkageNote', 'Linkage Note')}:</strong> {transferData.note}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="primary" onClick={handleAppointPatient}>
          {t('appointPatient', 'Appoint patient')}
        </Button>
        <Button kind="secondary" onClick={closeModal}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default TransferDetailsModal;
