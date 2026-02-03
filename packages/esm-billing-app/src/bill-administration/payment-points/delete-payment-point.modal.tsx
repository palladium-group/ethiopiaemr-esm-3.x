import React from 'react';
import { useTranslation } from 'react-i18next';
import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { ModalHeader, ModalBody, ModalFooter, Button } from '@carbon/react';

import { PaymentPoint } from '../../types';
import { deletePaymentPoint } from './payment-points.resource';
import { mutate } from 'swr';

type DeletePaymentPointModalProps = {
  closeModal: () => void;
  paymentPoint: PaymentPoint;
};

export const DeletePaymentPointModal: React.FC<DeletePaymentPointModalProps> = ({ closeModal, paymentPoint }) => {
  const { t } = useTranslation();

  const handleDelete = async () => {
    try {
      const response = await deletePaymentPoint(paymentPoint.uuid);
      if (response.ok) {
        showSnackbar({
          title: t('paymentPointDeleted', 'Payment point deleted'),
          subtitle: t('paymentPointDeletedSubtitle', 'The payment point has been deleted'),
          kind: 'success',
        });
        mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/cashier/cashPoint`), undefined, {
          revalidate: true,
        });
        closeModal();
      }
    } catch (error) {
      console.error('Error deleting payment point:', error);
      showSnackbar({
        title: t('paymentPointDeletedError', 'Error deleting payment point'),
        subtitle: t('paymentPointDeletedErrorSubtitle', 'An error occurred while deleting the payment point'),
        kind: 'error',
      });
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal}>{t('deletePaymentPoint', 'Delete Payment Point')}</ModalHeader>
      <ModalBody>{t('deletePaymentPointDescription', 'Are you sure you want to delete this payment point?')}</ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete}>
          {t('delete', 'Delete')}
        </Button>
      </ModalFooter>
    </>
  );
};
