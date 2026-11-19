import React from 'react';
import { ModalHeader, ModalBody, ModalFooter, Button, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { type BillDepositTransaction } from '../../types/bill-deposit.types';
import { reverseTransaction } from '../../utils/bill-deposit.utils';
import { extractErrorMessagesFromResponse } from '../../../../utils';

type ReverseTransactionModalProps = {
  onClose: () => void;
  depositUuid: string;
  transaction: BillDepositTransaction;
};

const ReverseTransactionModal: React.FC<ReverseTransactionModalProps> = ({ onClose, depositUuid, transaction }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const handleReverse = async () => {
    setIsLoading(true);
    try {
      await reverseTransaction(depositUuid, transaction.uuid, reason.trim());
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('transactionReversed', 'Transaction reversed successfully'),
      });
      // the line item the deposit was applied to changes too
      mutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith(`${restBaseUrl}/cashier/deposit`) || key.startsWith(`${restBaseUrl}/cashier/bill`)),
        undefined,
        { revalidate: true },
      );
      onClose();
    } catch (error) {
      showSnackbar({
        title: t('transactionReverseError', 'Error reversing transaction'),
        kind: 'error',
        subtitle: error?.responseBody ? extractErrorMessagesFromResponse(error.responseBody) : error?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <ModalHeader closeModal={onClose}>{t('reverseTransaction', 'Reverse Transaction')}</ModalHeader>
      <ModalBody>
        <p>{t('reverseTransactionConfirmation', 'Are you sure you want to reverse this transaction?')}</p>
        <TextInput
          id="reverseTransactionReason"
          labelText={t('reverseTransactionReason', 'Reason for reversing')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleReverse} disabled={isLoading || !reason.trim()}>
          {t('reverse', 'Reverse')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default ReverseTransactionModal;
