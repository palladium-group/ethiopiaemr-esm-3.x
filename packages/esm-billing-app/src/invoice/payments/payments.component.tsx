import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  ComposedModal,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { navigate, showSnackbar, useVisit, useConfig, UserHasAccess } from '@openmrs/esm-framework';
import type { BillingConfig } from '../../config-schema';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { z } from 'zod';
import { processBillPayment, usePaymentModes } from '../../billing.resource';
import { useClockInStatus } from '../../bill-administration/payment-points/use-clock-in-status';
import { LineItem, PaymentFormValue, PaymentStatus, type MappedBill } from '../../types';
import { computeWaivedAmount, extractErrorMessagesFromResponse } from '../../utils';
import { InvoiceBreakDown } from './invoice-breakdown/invoice-breakdown.component';
import PaymentForm from './payment-form/payment-form.component';
import PaymentHistory from './payment-history/payment-history.component';
import styles from './payments.scss';
import { createPaymentPayload } from './utils';
import { usePaymentSchema } from '../../hooks/usePaymentSchema';
import { useCurrencyFormatting } from '../../helpers/currency';
import useBillableServices from '../../hooks/useBillableServices';
import { Permissions } from '../../permission/permissions.constants';

type PaymentProps = {
  bill: MappedBill;
  selectedLineItems: Array<LineItem>;
};

const Payments: React.FC<PaymentProps> = ({ bill, selectedLineItems }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { lineItems } = bill;
  const { visitAttributeTypes } = useConfig<BillingConfig>();

  const paymentSchema = usePaymentSchema(bill);
  const { globalActiveSheet } = useClockInStatus();
  const { activeVisit } = useVisit(bill.patientUuid);
  const activeVisitPaymentMethod = activeVisit?.attributes?.find(
    (attribute) => attribute.attributeType.uuid === visitAttributeTypes.paymentMethods,
  );
  const { paymentModes, isLoading: isLoadingPaymentModes, error: errorPaymentModes } = usePaymentModes();
  const {
    billableServices,
    isLoading: isLoadingBillableServices,
    error: errorBillableServices,
  } = useBillableServices();

  const methods = useForm<PaymentFormValue>({
    mode: 'onSubmit',
    defaultValues: { payment: [] },
    resolver: zodResolver(z.object({ payment: z.array(paymentSchema) })),
  });
  const formArrayMethods = useFieldArray({ name: 'payment', control: methods.control });
  const hasInitialized = useRef(false);
  const methodsRef = useRef(methods);
  methodsRef.current = methods;

  useEffect(() => {
    if (
      isLoadingBillableServices ||
      errorBillableServices ||
      !activeVisit ||
      isLoadingPaymentModes ||
      errorPaymentModes ||
      hasInitialized.current
    ) {
      return;
    }
    // Track processed line items to avoid duplicates when billableService has multiple servicePrices
    const processedLineItems = new Set<string>();
    // Aggregate amounts by payment mode UUID
    const paymentModeTotals = new Map<string, number>();

    // Loop through line items and select one servicePrice per line item
    lineItems
      .filter((item) => item.paymentStatus !== PaymentStatus.PAID)
      .forEach((item) => {
        // Skip if already processed
        if (processedLineItems.has(item.uuid)) {
          return;
        }

        const extractedUuid = item.billableService?.split(':')[0];
        const billableService = billableServices?.find((service) => service.uuid === extractedUuid);

        if (!billableService?.servicePrices?.length) {
          return;
        }

        // Prefer servicePrice matching activeVisitPaymentMethod, otherwise use the first one
        const selectedServicePrice =
          billableService.servicePrices.find((price) => price.paymentMode.uuid === activeVisitPaymentMethod?.value) ||
          billableService.servicePrices[0];

        // Mark this line item as processed to avoid adding it multiple times
        processedLineItems.add(item.uuid);

        // Aggregate by payment mode
        const currentTotal = paymentModeTotals.get(selectedServicePrice.paymentMode.uuid) || 0;
        paymentModeTotals.set(
          selectedServicePrice.paymentMode.uuid,
          currentTotal + selectedServicePrice.price * item.quantity,
        );
      });

    // Create form items from aggregated totals
    paymentModeTotals.forEach((totalAmount, paymentModeUuid) => {
      const paymentMode = paymentModes?.find((mode) => mode.uuid === paymentModeUuid);
      if (paymentMode && totalAmount > 0) {
        formArrayMethods.append({
          method: paymentMode,
          amount: totalAmount,
          referenceCode: '',
        });
      }
    });

    // Trigger validation to update formState.isValid after appending items
    methodsRef.current.trigger('payment');

    hasInitialized.current = true;
  }, [
    lineItems,
    billableServices,
    isLoadingBillableServices,
    errorBillableServices,
    activeVisit,
    activeVisitPaymentMethod,
    activeVisitPaymentMethod?.value,
    isLoadingPaymentModes,
    errorPaymentModes,
    paymentModes,
    formArrayMethods,
  ]);

  const formValues = useWatch({
    name: 'payment',
    control: methods.control,
  });

  const totalWaivedAmount = computeWaivedAmount(bill);
  const totalAmountTendered = formValues?.reduce((curr: number, prev) => Number(prev.amount) + curr, 0) ?? 0;
  const amountDue = bill.balance - totalAmountTendered;

  // selected line items amount due
  const selectedLineItemsAmountDue =
    selectedLineItems
      .filter((item) => item.paymentStatus !== PaymentStatus.PAID)
      .reduce((curr: number, prev) => curr + Number(prev.price * prev.quantity), 0) - totalWaivedAmount;

  const handleNavigateToBillingDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'home/billing',
    });

  const handleProcessPayment = async (): Promise<boolean> => {
    const { remove } = formArrayMethods;
    const paymentPayload = createPaymentPayload(
      bill,
      bill.patientUuid,
      formValues,
      amountDue,
      selectedLineItems,
      globalActiveSheet,
    );

    try {
      await processBillPayment(paymentPayload, bill.uuid);
      remove();
      showSnackbar({
        title: t('billPayment', 'Bill payment'),
        subtitle: 'Bill payment processing has been successful',
        kind: 'success',
        timeoutInMs: 3000,
      });
      const url = `/ws/rest/v1/cashier/bill/${bill.uuid}`;
      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
      return true;
    } catch (error) {
      setIsProcessing(false);
      setShowConfirmModal(false);
      showSnackbar({
        title: t('failedBillPayment', 'Bill payment failed'),
        subtitle: `An unexpected error occurred while processing your bill payment. Please contact the system administrator and provide them with the following error details: ${extractErrorMessagesFromResponse(
          error.responseBody,
        )}`,
        kind: 'error',
        timeoutInMs: 3000,
        isLowContrast: true,
      });
      return false;
    }
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    const success = await handleProcessPayment();
    setIsProcessing(false);
    if (success) {
      setShowConfirmModal(false);
    }
  };

  const amountDueDisplay = (amount: number) => (amount < 0 ? 'Client balance' : 'Amount Due');

  const isFullyPaid = totalAmountTendered >= selectedLineItemsAmountDue;
  const hasAmountPaidExceeded =
    formValues.some((item) => item.amount !== 0) &&
    totalAmountTendered > selectedLineItemsAmountDue &&
    bill.lineItems.length > 1;
  const isPaymentInvalid = !isFullyPaid && formValues.some((item) => item.amount !== 0) && bill.lineItems.length > 1;

  return (
    <FormProvider {...methods}>
      <div className={styles.wrapper}>
        <div className={styles.paymentContainer}>
          <CardHeader title={t('payments', 'Payments')}>
            <span></span>
          </CardHeader>
          <div>
            {bill && <PaymentHistory bill={bill} />}
            {isPaymentInvalid && (
              <InlineNotification
                title={t('incompletePayment', 'Incomplete payment')}
                subtitle={t(
                  'incompletePaymentSubtitle',
                  'Please ensure all selected line items are fully paid, Total amount expected is {{selectedLineItemsAmountDue}}',
                  {
                    selectedLineItemsAmountDue: formatCurrency(selectedLineItemsAmountDue),
                  },
                )}
                lowContrast
                kind="error"
                className={styles.paymentError}
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
                className={styles.paymentError}
              />
            )}
            <PaymentForm {...formArrayMethods} disablePayment={amountDue <= 0} amountDue={amountDue} />
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.paymentTotals}>
          <InvoiceBreakDown label={t('totalAmount', 'Total Amount')} value={formatCurrency(bill.totalAmount)} />
          <InvoiceBreakDown label={t('totalDeposits', 'Total Deposits')} value={formatCurrency(bill.totalDeposits)} />
          <InvoiceBreakDown
            label={t('totalTendered', 'Total Tendered')}
            value={formatCurrency(bill.tenderedAmount + totalAmountTendered)}
          />
          <InvoiceBreakDown label={t('discount', 'Discount')} value={'--'} />
          <InvoiceBreakDown
            hasBalance={amountDue < 0}
            label={amountDueDisplay(amountDue)}
            value={formatCurrency(amountDue)}
          />
          <div className={styles.processPayments}>
            <Button onClick={handleNavigateToBillingDashboard} kind="secondary">
              {t('discard', 'Discard')}
            </Button>
            <UserHasAccess privilege={Permissions.ProcessPayment}>
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={!formValues?.length || !methods.formState.isValid || hasAmountPaidExceeded}>
                {t('processPayment', 'Process Payment')}
              </Button>
            </UserHasAccess>
          </div>
        </div>
      </div>

      <ComposedModal
        open={showConfirmModal}
        onClose={() => !isProcessing && setShowConfirmModal(false)}
        preventCloseOnClickOutside={isProcessing}>
        <ModalHeader
          closeModal={!isProcessing ? () => setShowConfirmModal(false) : undefined}
          title={t('confirmPayment', 'Confirm Payment')}
        />
        <ModalBody>
          <p className={styles.confirmMessage}>
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
    </FormProvider>
  );
};

export default Payments;
