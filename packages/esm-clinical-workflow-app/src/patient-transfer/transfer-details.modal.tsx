import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModalBody, ModalHeader, Button, ModalFooter } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import type { TransferData } from './transfer-data.resource';
import styles from './transfer-details.scss';

interface TransferDetailsModalProps {
  transferData: TransferData;
  closeModal: () => void;
}

const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({ transferData, closeModal }) => {
  const { t } = useTranslation();

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('patientTransferInformation', 'Patient Transfer Information')} />
      <ModalBody>
        <div className={styles.container}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('transferDate', 'Transfer Date')}:</strong>{' '}
            {formatDate(parseDate(transferData.transferDate), { mode: 'wide' })}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('fromLocation', 'Transfer From')}:</strong> {transferData.fromLocation}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('transferNote', 'Transfer Note')}:</strong> {transferData.note}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default TransferDetailsModal;
