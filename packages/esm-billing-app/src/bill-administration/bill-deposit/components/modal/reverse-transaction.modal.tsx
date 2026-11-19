import React from 'react';
import { ModalHeader, ModalBody, ModalFooter, Button } from '@carbon/react';
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

  const handleReverse = async () => {
    setIsLoading(true);
    try {
      await reverseTransaction(depositUuid, transaction.uuid);
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
      <ModalBody>{t('reverseTransactionConfirmation', 'Are you sure you want to reverse this transaction?')}</ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleReverse} disabled={isLoading}>
          {t('reverse', 'Reverse')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default ReverseTransactionModal;
