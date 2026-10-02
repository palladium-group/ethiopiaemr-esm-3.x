import React from 'react';
import { Tag } from '@carbon/react';
import { formatTime, parseDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormatting } from '../helpers/currency';
import { paymentStatusTagType } from '../invoice/timeline/bill-timeline.component';
import { LineItem } from '../types';
import styles from './bills-table.scss';

export const lineItemName = (lineItem: LineItem) =>
  lineItem?.billableService?.split(':')[1] || lineItem?.item?.split(':')[1] || '--';

export const lineItemTotal = (lineItem: LineItem) => Number(lineItem.price) * Number(lineItem.quantity);

type BillLineItemsProps = {
  lineItems: Array<LineItem>;
};

/** The line items of one bill, shown when its row in the bills table is expanded. */
const BillLineItems: React.FC<BillLineItemsProps> = ({ lineItems }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  if (!lineItems?.length) {
    return <p className={styles.noLineItems}>{t('noItemsAddedToday', 'No items were added to this bill today')}</p>;
  }

  return (
    <table className={styles.lineItemsTable}>
      <thead>
        <tr>
          <th>{t('item', 'Item')}</th>
          <th>{t('addedAt', 'Added')}</th>
          <th className={styles.numeric}>{t('quantity', 'Quantity')}</th>
          <th className={styles.numeric}>{t('price', 'Price')}</th>
          <th className={styles.numeric}>{t('total', 'Total')}</th>
          <th>{t('status', 'Status')}</th>
        </tr>
      </thead>
      <tbody>
        {lineItems.map((lineItem) => {
          const dateCreated = lineItem?.auditInfo?.dateCreated;
          return (
            <tr key={lineItem.uuid}>
              <td>{lineItemName(lineItem)}</td>
              <td>{dateCreated ? formatTime(parseDate(dateCreated)) : '--'}</td>
              <td className={styles.numeric}>{lineItem.quantity}</td>
              <td className={styles.numeric}>{formatCurrency(lineItem.price)}</td>
              <td className={styles.numeric}>{formatCurrency(lineItemTotal(lineItem))}</td>
              <td>
                <Tag size="sm" type={paymentStatusTagType(lineItem.paymentStatus)}>
                  {lineItem.paymentStatus}
                </Tag>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default BillLineItems;
