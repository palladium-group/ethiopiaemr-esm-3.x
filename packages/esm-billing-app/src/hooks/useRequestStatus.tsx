import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { from, interval, of } from 'rxjs';
import { catchError, scan, startWith, switchMap, take, takeWhile } from 'rxjs/operators';
import { processBillPayment, usePaymentModes } from '../billing.resource';
import { BillingConfig } from '../config-schema';
import { extractServiceIdentifier } from '../invoice/payments/utils';
import { getErrorMessage, getRequestStatus, readableStatusMap } from '../telebirr/telebirr-resource';
import { useClockInStatus } from '../bill-administration/payment-points/use-clock-in-status';
import { LineItem, MappedBill, PaymentStatus, RequestStatus, Timesheet } from '../types';
import { extractErrorMessagesFromResponse, waitForASecond } from '../utils';

type RequestData = {
  originatorConversationId: string | null;
  requestStatus: RequestStatus | null;
  amount: string | null;
};

type PollState = {
  attempts: number;
  lastStatus: RequestStatus | null;
  lastReferenceCode?: string;
};

export const createMobileMoneyPaymentPayload = (
  bill: MappedBill,
  amount: number,
  mobileMoneyInstanceTypeUUID: string,
  paymentReference: { uuid: string; value: string },
  timesheet?: Timesheet,
) => {
  const { cashier } = bill;
  const totalAmount = bill?.totalAmount;
  const tenderedAmount = Number(bill.tenderedAmount);
  const amountDue = Number(bill.totalAmount) - (tenderedAmount + amount);
  const paymentStatus = amountDue <= 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

  const previousPayments = bill.payments.map((payment) => ({
    amount: payment.amount,
    amountTendered: payment.amountTendered,
    attributes: payment.attributes.map((att) => {
      return {
        attributeType: att.attributeType.uuid,
        value: att.value,
      };
    }),
    instanceType: payment.instanceType.uuid,
  }));

  const newPayment = {
    amount: parseFloat(totalAmount.toFixed(2)),
    amountTendered: parseFloat(amount.toFixed(2)),
    attributes: [
      {
        attributeType: paymentReference.uuid,
        value: paymentReference.value,
      },
    ],
    instanceType: mobileMoneyInstanceTypeUUID,
  };

  const updatedPayments = [...previousPayments, newPayment];
  const updatedLineItems: LineItem[] = [];

  let remainingPayment = tenderedAmount + amount;

  for (let i = 0; i < bill.lineItems.length; i++) {
    const lineItem = bill.lineItems[i];
    const totalLineItemAmount = lineItem.price * lineItem.quantity;
    const newLineItem: LineItem = {
      ...lineItem,
      billableService: extractServiceIdentifier(lineItem),
      item: extractServiceIdentifier(lineItem),
    };

    if (remainingPayment >= totalLineItemAmount) {
      remainingPayment -= totalLineItemAmount;
      updatedLineItems.push({ ...newLineItem, paymentStatus: PaymentStatus.PAID });
    } else {
      updatedLineItems.push(newLineItem);
    }
  }

  const newBillPaymentStatus = updatedLineItems.some((item) => item.paymentStatus === PaymentStatus.PENDING)
    ? PaymentStatus.PENDING
    : PaymentStatus.PAID;

  const processedPayment = {
    cashPoint: timesheet ? timesheet.cashPoint.uuid : bill.cashPointUuid,
    cashier: timesheet ? timesheet.cashier.uuid : cashier.uuid,
    lineItems: updatedLineItems,
    payments: updatedPayments,
    patient: bill.patientUuid,
    status: updatedLineItems.length > 0 ? newBillPaymentStatus : paymentStatus,
  };

  return processedPayment;
};

/**
 * useRequestStatus
 * @param setNotification a function to call with the appropriate notification type
 * @returns a function to trigger the polling.
 */
export const useRequestStatus = (
  setNotification: React.Dispatch<SetStateAction<{ type: 'error' | 'success'; message: string } | null>>,
  closeModal: () => void,
  bill: MappedBill,
): [RequestData, React.Dispatch<React.SetStateAction<RequestData | null>>] => {
  const { t } = useTranslation();
  const { telebirrAPIBaseUrl } = useConfig<BillingConfig>();
  const { paymentModes } = usePaymentModes();

  // TODO: make this configurable
  const POLL_INTERVAL_MS = 3000;
  const MAX_ATTEMPTS = 5;

  // Get the payment reference UUID for the mobile money payment mode
  const paymentReferenceUUID = paymentModes
    .find((mode) => mode.name === 'Mobile Money')
    ?.attributeTypes.find((type) => type.description === 'Reference Number')?.uuid;

  const [requestData, setRequestData] = useState<RequestData>({
    originatorConversationId: null,
    requestStatus: null,
    amount: null,
  });

  const { globalActiveSheet } = useClockInStatus();

  useEffect(() => {
    if (!requestData.originatorConversationId) {
      return;
    }

    if (['COMPLETE', 'FAILED', 'NOT-FOUND'].includes(requestData.requestStatus)) {
      return;
    }

    let latestState: PollState = {
      attempts: 0,
      lastStatus: requestData.requestStatus,
      lastReferenceCode: undefined,
    };

    const polling$ = interval(POLL_INTERVAL_MS).pipe(
      startWith(0),
      take(MAX_ATTEMPTS),
      switchMap(() =>
        from(getRequestStatus(requestData.originatorConversationId, telebirrAPIBaseUrl)).pipe(
          catchError((error) => {
            setNotification({ type: 'error', message: getErrorMessage(error, t) });
            return of(null);
          }),
        ),
      ),
      scan(
        (state: PollState, result: { status: RequestStatus; referenceCode?: string } | null) => {
          // On transport/HTTP error, keep lastStatus as-is but still count an attempt,
          // so we continue polling up to MAX_ATTEMPTS.
          if (!result) {
            return { ...state, attempts: state.attempts + 1 };
          }

          return {
            attempts: state.attempts + 1,
            lastStatus: result.status,
            lastReferenceCode: result.referenceCode,
          };
        },
        {
          attempts: 0,
          lastStatus: requestData.requestStatus,
          lastReferenceCode: undefined,
        } as PollState,
      ),
      // Keep polling on errors or INITIATED until we either:
      // - hit a real terminal status (handled in the subscriber), or
      // - exhaust MAX_ATTEMPTS (handled in complete handler as timeout).
      takeWhile(
        (state) =>
          state.attempts < MAX_ATTEMPTS &&
          state.lastStatus !== 'COMPLETE' &&
          state.lastStatus !== 'FAILED' &&
          state.lastStatus !== 'NOT-FOUND',
        true,
      ),
    );

    const subscription = polling$.subscribe({
      next: (state) => {
        latestState = state;
        const { lastStatus, lastReferenceCode } = state;

        if (!lastStatus) {
          return;
        }

        if (lastStatus === 'COMPLETE') {
          setRequestData((prev) => ({
            ...prev,
            originatorConversationId: null,
            requestStatus: 'COMPLETE',
          }));

          waitForASecond().then(() => {
            closeModal();
          });

          const mobileMoneyPaymentMethodInstanceTypeUUID = paymentModes.find(
            (method) => method.name === 'Mobile Money',
          ).uuid;

          const mobileMoneyPayload = createMobileMoneyPaymentPayload(
            bill,
            parseInt(requestData.amount),
            mobileMoneyPaymentMethodInstanceTypeUUID,
            { uuid: paymentReferenceUUID, value: lastReferenceCode },
            globalActiveSheet,
          );

          processBillPayment(mobileMoneyPayload, bill.uuid).then(
            () => {
              showSnackbar({
                title: t('billPayment', 'Bill payment'),
                subtitle: 'Bill payment processing has been successful',
                kind: 'success',
                timeoutInMs: 3000,
              });
              const url = `/ws/rest/v1/cashier/bill/${bill.uuid}`;
              mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
            },
            (error) => {
              showSnackbar({
                title: t('failedBillPayment', 'Bill payment failed'),
                subtitle: `An unexpected error occurred while processing your bill payment. Please contact the system administrator and provide them with the following error details: ${extractErrorMessagesFromResponse(
                  error.responseBody,
                )}`,
                kind: 'error',
                timeoutInMs: 3000,
                isLowContrast: true,
              });
            },
          );

          return;
        }

        if (lastStatus === 'FAILED' || lastStatus === 'NOT-FOUND') {
          setRequestData((prev) => ({
            ...prev,
            originatorConversationId: null,
            requestStatus: lastStatus,
          }));
          setNotification({ type: 'error', message: readableStatusMap.get(lastStatus) });
          return;
        }

        if (lastStatus === 'INITIATED') {
          setNotification({ type: 'success', message: readableStatusMap.get(lastStatus) });
        }
      },
      complete: () => {
        // onComplete: handle timeout case where we exhausted attempts but remained INITIATED or UNKNOWN (network error)
        const timedOut =
          (latestState.lastStatus === 'INITIATED' || latestState.lastStatus === 'UNKNOWN') &&
          latestState.attempts >= MAX_ATTEMPTS;
        if (timedOut) {
          setNotification({
            type: 'error',
            message: 'Payment confirmation timed out. Please try again.',
          });
        }

        setRequestData((prev) => ({
          ...prev,
          originatorConversationId: null,
          // Clear waiting state on timeout so the modal shows only the error notification
          requestStatus: timedOut ? null : latestState.lastStatus ?? prev.requestStatus,
        }));
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    bill,
    closeModal,
    telebirrAPIBaseUrl,
    paymentModes,
    paymentReferenceUUID,
    requestData.amount,
    requestData.originatorConversationId,
    requestData.requestStatus,
    setNotification,
    t,
    globalActiveSheet,
  ]);

  return [requestData, setRequestData];
};
