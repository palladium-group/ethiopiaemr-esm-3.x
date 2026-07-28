import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextArea } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { declineOrder } from '../../resources/hooks/useOrders';

interface RejectOrderModalProps {
  orderUuid: string;
  mutate: () => void;
  closeModal: () => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({ orderUuid, mutate, closeModal }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await declineOrder(orderUuid, reason);
      showSnackbar({
        title: t('orderDeclined', 'Order declined'),
        subtitle: t('orderDeclinedSubtitle', 'The order has been marked as not done.'),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
      closeModal();
    } catch {
      showSnackbar({ title: t('declineError', 'Failed to decline order'), kind: 'error', isLowContrast: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('rejectOrder', 'Reject order')} />
      <ModalBody>
        <p style={{ marginBottom: '1rem' }}>
          {t('rejectOrderDescription', 'This will mark the order as not done. Please provide a reason.')}
        </p>
        <TextArea
          id="reject-order-reason"
          labelText={t('reason', 'Reason')}
          placeholder={t('rejectOrderReasonPlaceholder', 'Describe why this order cannot be performed...')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleReject} disabled={isSubmitting || !reason.trim()}>
          {isSubmitting ? (
            <InlineLoading description={t('rejecting', 'Rejecting...')} />
          ) : (
            t('confirmReject', 'Confirm rejection')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default RejectOrderModal;
