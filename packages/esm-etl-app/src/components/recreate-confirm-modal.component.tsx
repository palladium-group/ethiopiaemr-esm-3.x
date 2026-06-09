import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@carbon/react';

interface RecreateConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const RecreateConfirmModal: React.FC<RecreateConfirmModalProps> = ({ open, onConfirm, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      danger
      modalHeading={t('recreateWarningTitle', 'Warning: Destructive Operation')}
      primaryButtonText={t('confirmRecreate', 'Yes, Recreate Tables')}
      secondaryButtonText={t('cancel', 'Cancel')}
      onRequestSubmit={onConfirm}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}>
      <p>
        {t(
          'recreateWarningBody',
          'This will DROP and rebuild all ETL flat tables, then fully repopulate them from scratch. Reports will be incomplete until it finishes.',
        )}
      </p>
    </Modal>
  );
};

export default RecreateConfirmModal;
