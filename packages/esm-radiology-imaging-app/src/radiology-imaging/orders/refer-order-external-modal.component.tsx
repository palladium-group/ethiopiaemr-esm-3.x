import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextArea, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { referOrderExternally } from '../workspace/preliminary.resource';
import { updateOrderFulfillmentStatus } from '../../resources/hooks/useOrders';

interface ReferOrderExternalModalProps {
  orderUuid: string;
  mutate: () => void;
  closeModal: () => void;
}

const ReferOrderExternalModal: React.FC<ReferOrderExternalModalProps> = ({ orderUuid, mutate, closeModal }) => {
  const { t } = useTranslation();
  const [referralReason, setReferralReason] = useState('');
  const [referralDestination, setReferralDestination] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateOrderFulfillmentStatus(orderUuid, 'EXCEPTION');
      await referOrderExternally(orderUuid, referralReason, referralDestination);
      showSnackbar({
        title: t('orderReferred', 'Order referred'),
        subtitle: t('orderReferredSubtitle', 'The order has been referred to an external facility.'),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
      closeModal();
    } catch {
      showSnackbar({ title: t('referralError', 'Failed to refer order'), kind: 'error', isLowContrast: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = referralReason.trim() && referralDestination.trim();

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('referOrderExternal', 'Refer order to external facility')} />
      <ModalBody>
        <p style={{ marginBottom: '1rem' }}>
          {t(
            'referOrderDescription',
            'This will mark the order as referred to an external facility. Please provide the referral details.',
          )}
        </p>
        <TextInput
          id="referral-destination"
          labelText={t('referralDestination', 'Referral destination')}
          placeholder={t('referralDestinationPlaceholder', 'e.g. External Radiology Center')}
          value={referralDestination}
          onChange={(e) => setReferralDestination(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        <TextArea
          id="referral-reason"
          labelText={t('referralReason', 'Referral reason')}
          placeholder={t('referralReasonPlaceholder', 'e.g. MRI not available onsite')}
          value={referralReason}
          onChange={(e) => setReferralReason(e.target.value)}
          rows={4}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleSubmit} disabled={isSubmitting || !isValid}>
          {isSubmitting ? (
            <InlineLoading description={t('referring', 'Referring...')} />
          ) : (
            t('confirmReferral', 'Confirm referral')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ReferOrderExternalModal;
