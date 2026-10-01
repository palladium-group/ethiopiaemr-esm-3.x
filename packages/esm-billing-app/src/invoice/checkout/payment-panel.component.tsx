import React, { useEffect, useState } from 'react';
import {
  Button,
  ComposedModal,
  Dropdown,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  TextInput,
} from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { showSnackbar, UserHasAccess } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { z } from 'zod';
import { useCurrencyFormatting } from '../../helpers/currency';
import { usePaymentSchema } from '../../hooks/usePaymentSchema';
import { Permissions } from '../../permission/permissions.constants';
import { LineItem, MappedBill, PaymentMethod } from '../../types';
import { computeWaivedAmount, extractErrorMessagesFromResponse } from '../../utils';
import { makePayment } from '../payments/payments.resource';
import { createLineItemPaymentPayload, getPayableLineItemUuids } from '../payments/utils';
import { lineItemTotal, PaymentGroup } from './checkout.resource';
import styles from './checkout.scss';

type PaymentOption = { id: number; method: PaymentMethod | null; amount: number | ''; referenceCode: string };

type PaymentPanelProps = {
  bill: MappedBill;
  selectedLineItems: Array<LineItem>;
  /** The default split of the selected line items by payment method. */
  groups: Array<PaymentGroup>;
  paymentModes: Array<PaymentMethod>;
};

let nextOptionId = 1;

const roundCurrency = (value: number) => parseFloat(Number(value).toFixed(2));

const hasReferenceField = (method: PaymentMethod | null) => (method?.attributeTypes?.length ?? 0) > 0;

/**
 * The payment options for the selected line items. They start from the default split by payment method and
 * keep following the ticked items until the cashier changes a method or amount, removes an option or adds
 * one; after that they stay as entered until reset.
 */
const PaymentPanel: React.FC<PaymentPanelProps> = ({ bill, selectedLineItems, groups, paymentModes }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const paymentSchema = usePaymentSchema(bill);
  const [options, setOptions] = useState<Array<PaymentOption>>([]);
  const [isEdited, setIsEdited] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const findMode = (uuid: string | null) => paymentModes.find((mode) => mode.uuid === uuid) ?? null;

  // Recalculating the split keeps a reference number already typed for the same method.
  const defaultOptions = (previous: Array<PaymentOption>): Array<PaymentOption> =>
    groups.map((group) => {
      const method = findMode(group.methodUuid);
      return {
        id: nextOptionId++,
        method,
        amount: roundCurrency(group.amount),
        referenceCode: previous.find((option) => method && option.method?.uuid === method.uuid)?.referenceCode ?? '',
      };
    });

  const groupsSignature = groups.map((group) => `${group.methodUuid}:${group.amount}`).join('|');
  const modesSignature = paymentModes.map((mode) => mode.uuid).join('|');

  useEffect(() => {
    if (!isEdited) {
      setOptions((previous) => defaultOptions(previous));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsSignature, modesSignature, isEdited]);

  const changeOption = (id: number, patch: Partial<PaymentOption>) => {
    // A reference number is not a change to the split, so the amounts keep following the ticked items.
    if ('method' in patch || 'amount' in patch) {
      setIsEdited(true);
    }
    setOptions((previous) => previous.map((option) => (option.id === id ? { ...option, ...patch } : option)));
  };

  const removeOption = (id: number) => {
    setIsEdited(true);
    setOptions((previous) => previous.filter((option) => option.id !== id));
  };

  const addOption = () => {
    setIsEdited(true);
    setOptions((previous) => [...previous, { id: nextOptionId++, method: null, amount: '', referenceCode: '' }]);
  };

  const totalAmountTendered = roundCurrency(options.reduce((sum, option) => sum + Number(option.amount || 0), 0));
  const selectedLineItemsAmountDue = roundCurrency(
    selectedLineItems.reduce((sum, lineItem) => sum + lineItemTotal(lineItem), 0) - computeWaivedAmount(bill),
  );
  const amountDue = bill.balance - totalAmountTendered;

  const isExactSelectedPayment = selectedLineItemsAmountDue > 0 && totalAmountTendered === selectedLineItemsAmountDue;
  const hasAmountPaidExceeded = selectedLineItemsAmountDue > 0 && totalAmountTendered > selectedLineItemsAmountDue;
  const isPaymentIncomplete = selectedLineItemsAmountDue > 0 && totalAmountTendered < selectedLineItemsAmountDue;

  // The same per-option rules as the previous payment form.
  const areOptionsValid = z.array(paymentSchema).safeParse(
    options.map((option) => ({
      method: option.method,
      amount: Number(option.amount || 0),
      referenceCode: option.referenceCode,
    })),
  ).success;

  const canProcessPayment = options.length > 0 && areOptionsValid && isExactSelectedPayment;

  const handleProcessPayment = async (): Promise<boolean> => {
    if (!isExactSelectedPayment) {
      return false;
    }

    const lineItemUuids = getPayableLineItemUuids(selectedLineItems);
    const createdUuids: string[] = [];
    let failureError: any = null;

    const optionsToPay = options.filter((option) => option.method?.uuid && Number(option.amount) > 0);

    for (const option of optionsToPay) {
      const paymentPayload = createLineItemPaymentPayload({
        method: option.method,
        amount: Number(option.amount),
        referenceCode: option.referenceCode,
        lineItemUuids,
      });

      try {
        const response = await makePayment(bill.uuid, paymentPayload);
        if (!response.ok || !response.data?.uuid) {
          throw response;
        }
        createdUuids.push(response.data.uuid);
      } catch (error) {
        failureError = error;
        break;
      }
    }

    const url = `/ws/rest/v1/cashier/bill/${bill.uuid}`;
    mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });

    if (!failureError) {
      setIsEdited(false);
      showSnackbar({
        title: t('billPayment', 'Bill payment'),
        subtitle: t('billPaymentSuccessful', 'Bill payment processing has been successful'),
        kind: 'success',
        timeoutInMs: 3000,
      });
      return true;
    }

    if (createdUuids.length === 0) {
      setIsProcessing(false);
      setShowConfirmModal(false);
      showSnackbar({
        title: t('failedBillPayment', 'Bill payment failed'),
        subtitle: `An unexpected error occurred while processing your bill payment. Please contact the system administrator and provide them with the following error details: ${extractErrorMessagesFromResponse(
          failureError?.responseBody,
        )}`,
        kind: 'error',
        timeoutInMs: 3000,
        isLowContrast: true,
      });
      return false;
    }

    showSnackbar({
      title: t('partialBillPayment', 'Partial bill payment'),
      subtitle: t('partialBillPaymentSubtitle', 'Some payments were saved before an error occurred: {{error}}', {
        error: extractErrorMessagesFromResponse(failureError?.responseBody),
      }),
      kind: 'warning',
      timeoutInMs: 5000,
    });
    setIsEdited(false);
    return true;
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    const success = await handleProcessPayment();
    setIsProcessing(false);
    if (success) {
      setShowConfirmModal(false);
    }
  };

  const coveredClass = isExactSelectedPayment ? styles.coveredExact : hasAmountPaidExceeded ? styles.coveredOver : '';

  return (
    <aside className={styles.paymentPanel}>
      <div className={styles.covered}>
        <span className={styles.sectionLabel}>{t('tenderedOfDue', 'Tendered / due')}</span>
        <span className={`${styles.coveredValue} ${coveredClass}`}>
          {formatCurrency(totalAmountTendered)} / {formatCurrency(selectedLineItemsAmountDue)}
        </span>
      </div>

      <span className={styles.sectionLabel}>{t('paymentOptions', 'Payment options')}</span>
      {options.map((option) => (
        <div key={option.id} className={styles.option}>
          <div className={styles.optionRow}>
            <Dropdown
              id={`payment-method-${option.id}`}
              titleText=""
              aria-label={t('paymentMethod', 'Payment method')}
              label={t('selectPaymentMethod', 'Select payment method')}
              size="sm"
              items={paymentModes}
              itemToString={(item: PaymentMethod) => (item ? item.name : '')}
              selectedItem={option.method}
              onChange={({ selectedItem }: { selectedItem: PaymentMethod }) =>
                changeOption(option.id, { method: selectedItem ?? null })
              }
            />
            <NumberInput
              id={`payment-amount-${option.id}`}
              label={t('amount', 'Amount')}
              hideLabel
              size="sm"
              min={0}
              hideSteppers
              allowEmpty
              value={option.amount}
              onChange={(_event: unknown, { value }: { value: number | string }) =>
                changeOption(option.id, { amount: value === '' ? '' : Number(value) })
              }
            />
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              className={styles.removeOption}
              renderIcon={TrashCan}
              iconDescription={t('removePaymentOption', 'Remove payment option')}
              tooltipPosition="left"
              onClick={() => removeOption(option.id)}
            />
          </div>
          {hasReferenceField(option.method) && (
            <TextInput
              id={`payment-reference-${option.id}`}
              size="sm"
              labelText={t('referenceNumber', 'Reference number')}
              hideLabel
              placeholder={t('enterReferenceNumber', 'Enter ref. number')}
              value={option.referenceCode}
              onChange={(event) => changeOption(option.id, { referenceCode: event.target.value })}
            />
          )}
        </div>
      ))}

      <div className={styles.optionActions}>
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={addOption}>
          {t('addPaymentOptions', 'Add payment option')}
        </Button>
        {isEdited && (
          <Button kind="ghost" size="sm" onClick={() => setIsEdited(false)}>
            {t('resetPaymentOptions', 'Reset')}
          </Button>
        )}
      </div>

      {isPaymentIncomplete && (
        <InlineNotification
          title={t('incompletePayment', 'Incomplete payment')}
          subtitle={t(
            'incompletePaymentSubtitle',
            'Please ensure all selected line items are fully paid, Total amount expected is {{selectedLineItemsAmountDue}}',
            { selectedLineItemsAmountDue: formatCurrency(selectedLineItemsAmountDue) },
          )}
          lowContrast
          kind="error"
          hideCloseButton
          className={styles.notification}
        />
      )}
      {hasAmountPaidExceeded && (
        <InlineNotification
          title={t('overPayment', 'Over payment')}
          subtitle={t(
            'overPaymentSubtitle',
            'Amount paid {{totalAmountTendered}} should not be greater than amount due {{selectedLineItemsAmountDue}} for selected line items',
            {
              totalAmountTendered: formatCurrency(totalAmountTendered),
              selectedLineItemsAmountDue: formatCurrency(selectedLineItemsAmountDue),
            },
          )}
          lowContrast
          kind="warning"
          hideCloseButton
          className={styles.notification}
        />
      )}

      <UserHasAccess privilege={Permissions.ProcessPayment}>
        <Button
          className={styles.processPayment}
          disabled={!canProcessPayment}
          onClick={() => setShowConfirmModal(true)}>
          {t('processPayment', 'Process Payment')}
        </Button>
      </UserHasAccess>

      <ComposedModal
        open={showConfirmModal}
        onClose={() => !isProcessing && setShowConfirmModal(false)}
        preventCloseOnClickOutside={isProcessing}>
        <ModalHeader
          closeModal={!isProcessing ? () => setShowConfirmModal(false) : undefined}
          title={t('confirmPayment', 'Confirm Payment')}
        />
        <ModalBody>
          <p>
            {t(
              'confirmPaymentMessage',
              'Are you sure you want to process this payment? Total amount tendered: {{totalAmountTendered}}. Amount due: {{amountDue}}.',
              {
                totalAmountTendered: formatCurrency(totalAmountTendered),
                amountDue: formatCurrency(amountDue),
              },
            )}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setShowConfirmModal(false)} disabled={isProcessing}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" onClick={handleConfirmPayment} disabled={isProcessing}>
            {isProcessing ? (
              <InlineLoading description={t('processingPayment', 'Processing Payment')} />
            ) : (
              t('confirm', 'Confirm')
            )}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </aside>
  );
};

export default PaymentPanel;
