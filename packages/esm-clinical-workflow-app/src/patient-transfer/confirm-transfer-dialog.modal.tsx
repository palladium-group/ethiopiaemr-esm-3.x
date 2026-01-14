import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showModal, type Visit } from '@openmrs/esm-framework';

interface ConfirmTransferDialogProps {
  closeModal: () => void;
  activeVisit: Visit;
}

const ConfirmTransferDialog: React.FC<ConfirmTransferDialogProps> = ({ closeModal, activeVisit }) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = () => {
    if (isProcessing) {
      return;
    }
    setIsProcessing(true);

    // 1. Initiate closing the current modal
    closeModal();

    // 2. The "Double Frame" Guarantee:
    // First rAF: Wait for the close command to be acknowledged
    window.requestAnimationFrame(() => {
      // Second rAF: Wait for the browser to actually remove the element and repaint
      window.requestAnimationFrame(() => {
        const dispose = showModal('transition-patient-to-latest-queue-modal', {
          activeVisit,
          closeModal: () => {
            setIsProcessing(false);
            dispose();
          },
        });
      });
    });
  };

  return (
    <>
      <ModalHeader closeModal={closeModal}>{t('transferFormSaved', 'Patient transfer form saved')}</ModalHeader>
      <ModalBody>
        <p>{t('moveToQueueQuestion', 'Do you want to move the patient to a queue now?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} size="lg">
          {t('cancel', 'Cancel')}
        </Button>
        <Button autoFocus kind="primary" onClick={handleConfirm} size="lg" disabled={isProcessing}>
          {t('yesMoveToQueue', 'Yes, move to queue')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ConfirmTransferDialog;
