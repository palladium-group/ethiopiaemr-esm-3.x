import React from 'react';
import { showModal } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { LineItem, MappedBill, PaymentStatus } from '../types';
import ethSwitchLogo from './assets/ethswitch.png';
import telebirrLogo from './assets/telebirr.png';
import styles from './invoice.scss';

type PaymentChannelButtonsProps = {
  bill: MappedBill;
  selectedLineItems: Array<LineItem>;
};

/** Telebirr and EthSwitch, shown as their logos. They pay the ticked pending line items. */
const PaymentChannelButtons: React.FC<PaymentChannelButtonsProps> = ({ bill, selectedLineItems = [] }) => {
  const { t } = useTranslation();

  const hasBillableLineItems = (bill?.lineItems ?? []).some(
    (item) => item.paymentStatus !== PaymentStatus.EXEMPTED && item.paymentStatus !== PaymentStatus.PAID,
  );

  if (bill?.balance === 0 || !hasBillableLineItems) {
    return null;
  }

  const isDisabled = selectedLineItems.filter((item) => item.paymentStatus === PaymentStatus.PENDING).length === 0;

  const launch = (modalName: string) => {
    const dispose = showModal(modalName, {
      closeModal: () => dispose(),
      bill,
      selectedLineItems,
    });
  };

  const telebirrLabel = t('telebirrPayment', 'Telebirr Payment');
  const ethSwitchLabel = t('ethSwitchPayment', 'EthSwitch Payment');

  return (
    <div className={styles.paymentChannels}>
      <button
        type="button"
        className={`${styles.paymentChannel} ${styles.telebirrChannel}`}
        aria-label={telebirrLabel}
        title={telebirrLabel}
        disabled={isDisabled}
        onClick={() => launch('initiate-payment-modal')}>
        <img src={telebirrLogo} alt="" />
      </button>
      <button
        type="button"
        className={`${styles.paymentChannel} ${styles.ethSwitchChannel}`}
        aria-label={ethSwitchLabel}
        title={ethSwitchLabel}
        disabled={isDisabled}
        onClick={() => launch('ethswitch-payment-modal')}>
        <img src={ethSwitchLogo} alt="" />
      </button>
    </div>
  );
};

export default PaymentChannelButtons;
