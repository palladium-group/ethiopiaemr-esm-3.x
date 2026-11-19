import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContainedList,
  ContainedListItem,
  OverflowMenu,
  OverflowMenuItem,
  InlineNotification,
  Tag,
} from '@carbon/react';
import { BillDepositTransaction } from '../../../../types/bill-deposit.types';
import { formatDate, parseDate, showModal } from '@openmrs/esm-framework';
import styles from './transaction-list.scss';
import { useCurrencyFormatting } from '../../../../../../helpers/currency';
import { useDepositLineItemBills } from '../../../../hooks/useDepositLineItemBills';

type TransactionListProps = {
  transactions: Array<BillDepositTransaction>;
  depositUuid: string;
  patientUuid: string;
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, depositUuid, patientUuid }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const { billsByLineItem } = useDepositLineItemBills(patientUuid);

  const handleReverse = (transaction: BillDepositTransaction) => {
    const dispose = showModal('reverse-transaction-modal', {
      depositUuid: depositUuid,
      transaction,
      onClose: () => dispose(),
    });
  };

  if (!transactions?.length) {
    return (
      <InlineNotification
        aria-label="closes notification"
        kind="error"
        lowContrast
        statusIconDescription="notification"
        subtitle={t('noTransactions', 'No transactions found')}
        title={t('noTransactions', 'No transactions found')}
      />
    );
  }

  return (
    <ContainedList
      className={styles.transactionListContainer}
      size="sm"
      label={t('transactionList', 'Transaction List')}>
      {transactions.map((transaction) => {
        const bill = billsByLineItem.get(transaction.billLineItem?.uuid);
        // the server refuses to reverse a deposit on a closed bill
        const canReverse = !transaction.voided && !bill?.closed;
        const reversedOn = transaction.auditInfo?.dateVoided ?? transaction.auditInfo?.dateChanged;
        return (
          <ContainedListItem
            key={transaction.uuid}
            className={transaction.voided ? styles.reversed : undefined}
            action={
              canReverse ? (
                <OverflowMenu flipped size="sm" ariaLabel={t('transactionListOptions', 'Transaction list options')}>
                  <OverflowMenuItem onClick={() => handleReverse(transaction)} itemText={t('reverse', 'Reverse')} />
                </OverflowMenu>
              ) : null
            }>
            <div>
              {`${formatDate(parseDate(transaction.dateCreated))} - ${transaction.transactionType} - ${formatCurrency(
                transaction.amount,
              )}${bill ? ` - ${bill.lineItemName} (${bill.receiptNumber})` : ''}${
                transaction.reason ? ' - ' + transaction.reason : ''
              }`}
              {transaction.voided && (
                <Tag type="red" size="sm" className={styles.tag}>
                  {t('reversed', 'Reversed')}
                </Tag>
              )}
              {!transaction.voided && bill?.closed && (
                <Tag type="gray" size="sm" className={styles.tag}>
                  {t('billClosed', 'Bill closed')}
                </Tag>
              )}
            </div>
            {transaction.voided && (
              <div className={styles.reversalDetails}>
                {t('reversedBy', 'Reversed by {{user}} on {{date}}: {{reason}}', {
                  user: transaction.auditInfo?.voidedBy?.display ?? '--',
                  date: reversedOn ? formatDate(parseDate(reversedOn)) : '--',
                  reason: transaction.auditInfo?.voidReason ?? '--',
                })}
              </div>
            )}
          </ContainedListItem>
        );
      })}
    </ContainedList>
  );
};

export default TransactionList;
