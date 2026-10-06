import React from 'react';
import { InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { LineItem, MappedBill } from '../../types';
import { useLineItemSelection, usePaymentPlan } from './checkout.resource';
import LineItemsList from './line-items-list.component';
import PaymentPanel from './payment-panel.component';
import styles from './checkout.scss';

type InvoiceCheckoutProps = {
  bill: MappedBill;
  /** Reports the ticked line items, so the Telebirr and EthSwitch buttons in the header act on them. */
  onSelectItem?: (lineItems: Array<LineItem>) => void;
};

/** Line item selection and payment side by side: what is ticked on the left is what gets paid on the right. */
const InvoiceCheckout: React.FC<InvoiceCheckoutProps> = ({ bill, onSelectItem }) => {
  const { t } = useTranslation();
  const selection = useLineItemSelection(bill, onSelectItem);
  const plan = usePaymentPlan(bill, selection.selectedLineItems);

  return (
    <div className={styles.checkout}>
      <LineItemsList
        bill={bill}
        selection={selection}
        methodOf={plan.methodOf}
        visitMethodUuid={plan.visitMethodUuid}
      />
      {selection.payable.length > 0 &&
        (plan.isLoading ? (
          <InlineLoading description={t('loadingPaymentOptions', 'Loading payment options...')} />
        ) : (
          <PaymentPanel
            bill={bill}
            selectedLineItems={selection.selectedLineItems}
            groups={plan.groups}
            paymentModes={plan.paymentModes}
          />
        ))}
    </div>
  );
};

export default InvoiceCheckout;
