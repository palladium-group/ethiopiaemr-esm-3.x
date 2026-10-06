import React from 'react';
import { Checkbox, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormatting } from '../../helpers/currency';
import { LineItem, MappedBill } from '../../types';
import PaymentHistory from '../payments/payment-history/payment-history.component';
import { paymentStatusTagType } from '../timeline/bill-timeline.component';
import { isPayable, lineItemName, lineItemTotal, LineItemMethod, useLineItemSelection } from './checkout.resource';
import styles from './checkout.scss';

type LineItemsListProps = {
  bill: MappedBill;
  selection: ReturnType<typeof useLineItemSelection>;
  methodOf: (lineItem: LineItem) => LineItemMethod | null;
  visitMethodUuid?: string;
};

/** The bill's line items as a tick list. Unpaid items show the payment method they are paid by. */
const LineItemsList: React.FC<LineItemsListProps> = ({ bill, selection, methodOf, visitMethodUuid }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h5 className={styles.cardTitle}>{t('lineItems', 'Line items')}</h5>
        {selection.payable.length > 1 && (
          <span className={styles.links}>
            <button type="button" onClick={selection.selectAll}>
              {t('selectAllUnpaid', 'Select all unpaid')}
            </button>
            <button type="button" onClick={selection.clear}>
              {t('clearSelection', 'Clear')}
            </button>
          </span>
        )}
      </div>
      <ul className={styles.itemList}>
        {selection.lineItems.map((lineItem) => {
          const payable = isPayable(lineItem);
          const method = payable ? methodOf(lineItem) : null;
          return (
            <li key={lineItem.uuid} className={`${styles.itemRow} ${payable ? '' : styles.itemSettled}`}>
              <Checkbox
                id={`line-item-${lineItem.uuid}`}
                labelText={lineItemName(lineItem)}
                hideLabel
                checked={payable ? selection.isSelected(lineItem.uuid) : false}
                disabled={!payable}
                onChange={() => selection.toggle(lineItem.uuid)}
              />
              <div className={styles.itemMain}>
                <span className={styles.itemName}>{lineItemName(lineItem)}</span>
                <span className={styles.muted}>
                  {lineItem.quantity} × {formatCurrency(lineItem.price)}
                </span>
              </div>
              {payable && method && (
                <Tag size="sm" type={method.uuid === visitMethodUuid ? 'blue' : 'cool-gray'}>
                  {method.name}
                </Tag>
              )}
              {payable && !method && (
                <Tag size="sm" type="red">
                  {t('noPaymentMethodSet', 'No method set')}
                </Tag>
              )}
              {!payable && (
                <Tag size="sm" type={paymentStatusTagType(lineItem.paymentStatus)}>
                  {lineItem.paymentStatus}
                </Tag>
              )}
              <span className={styles.itemTotal}>{formatCurrency(lineItemTotal(lineItem))}</span>
            </li>
          );
        })}
      </ul>
      {bill?.payments?.length > 0 && (
        <div className={styles.paymentHistory}>
          <h6 className={styles.sectionLabel}>{t('paymentsReceived', 'Payments received')}</h6>
          <PaymentHistory bill={bill} />
        </div>
      )}
    </section>
  );
};

export default LineItemsList;
