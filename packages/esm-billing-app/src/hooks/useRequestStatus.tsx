import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { from, interval, of } from 'rxjs';
import { catchError, scan, startWith, switchMap, take, takeWhile } from 'rxjs/operators';
import { extractServiceIdentifier } from '../invoice/payments/utils';
import { getErrorMessage, getRequestStatus, readableStatusMap } from '../telebirr/telebirr-resource';
import { BillingConfig } from '../config-schema';
import { LineItem, MappedBill, PaymentStatus, RequestStatus, Timesheet } from '../types';
import { waitForASecond } from '../utils';

type RequestData = {
  originatorConversationId: string | null;
  requestStatus: RequestStatus | null;
};

type PollState = {
  attempts: number;
  lastStatus: RequestStatus | null;
  lastReferenceCode?: string;
  lastSettlementError?: string;
};

const TERMINAL_STATUSES: RequestStatus[] = ['COMPLETE', 'FAILED', 'NOT-FOUND', 'SETTLEMENT-FAILED'];

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
 *
 * Polls the payment middleware for the authoritative status of a Telebirr
 * payment intent. Settlement now happens server-side, so the browser only
 * observes the outcome and refreshes the bill view; it never settles the bill
 * itself.
 *
 * @param setNotification a function to call with the appropriate notification type
 * @returns a function to trigger the polling.
 */
export const useRequestStatus = (
  setNotification: React.Dispatch<SetStateAction<{ type: 'error' | 'success'; message: string } | null>>,
  closeModal: () => void,
  bill: MappedBill,
): [RequestData, React.Dispatch<React.SetStateAction<RequestData | null>>] => {
  const { t } = useTranslation();
  const { paymentAPIBaseUrl } = useConfig<BillingConfig>();

  const POLL_INTERVAL_MS = 6000;
  const MAX_ATTEMPTS = 10;

  const [requestData, setRequestData] = useState<RequestData>({
    originatorConversationId: null,
    requestStatus: null,
  });

  useEffect(() => {
    if (!requestData.originatorConversationId) {
      return;
    }

    if (TERMINAL_STATUSES.includes(requestData.requestStatus)) {
      return;
    }

    let latestState: PollState = {
      attempts: 0,
      lastStatus: requestData.requestStatus,
    };

    const polling$ = interval(POLL_INTERVAL_MS).pipe(
      startWith(0),
      take(MAX_ATTEMPTS),
      switchMap(() =>
        from(getRequestStatus(requestData.originatorConversationId, paymentAPIBaseUrl)).pipe(
          catchError((error) => {
            setNotification({ type: 'error', message: getErrorMessage(error, t) });
            return of(null);
          }),
        ),
      ),
      scan(
        (
          state: PollState,
          result: { status: RequestStatus; referenceCode?: string; settlementError?: string } | null,
        ) => {
          if (!result) {
            return { ...state, attempts: state.attempts + 1 };
          }

          return {
            attempts: state.attempts + 1,
            lastStatus: result.status,
            lastReferenceCode: result.referenceCode,
            lastSettlementError: result.settlementError,
          };
        },
        {
          attempts: 0,
          lastStatus: requestData.requestStatus,
        } as PollState,
      ),
      takeWhile((state) => state.attempts < MAX_ATTEMPTS && !TERMINAL_STATUSES.includes(state.lastStatus), true),
    );

    const subscription = polling$.subscribe({
      next: (state) => {
        latestState = state;
        const { lastStatus, lastSettlementError } = state;

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

          showSnackbar({
            title: t('billPayment', 'Bill payment'),
            subtitle: t('billPaymentSuccessful', 'Bill payment processing has been successful'),
            kind: 'success',
            timeoutInMs: 3000,
          });

          const url = `/ws/rest/v1/cashier/bill/${bill.uuid}`;
          mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });

          return;
        }

        if (lastStatus === 'SETTLEMENT-FAILED') {
          // Telebirr took the money but OpenMRS settlement failed. Surface a
          // distinct, prominent error and DO NOT prompt a retry, to avoid
          // charging the patient twice. Keep the modal open so the cashier
          // sees it and can escalate with the reference code.
          setRequestData((prev) => ({
            ...prev,
            originatorConversationId: null,
            requestStatus: 'SETTLEMENT-FAILED',
          }));

          const baseMessage = readableStatusMap.get('SETTLEMENT-FAILED');
          setNotification({
            type: 'error',
            message: lastSettlementError ? `${baseMessage} (${lastSettlementError})` : baseMessage,
          });

          showSnackbar({
            title: t('settlementFailed', 'Bill settlement failed'),
            subtitle: baseMessage,
            kind: 'error',
            timeoutInMs: 0,
            isLowContrast: true,
          });

          const url = `/ws/rest/v1/cashier/bill/${bill.uuid}`;
          mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });

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
        const timedOut =
          (latestState.lastStatus === 'INITIATED' || latestState.lastStatus === 'UNKNOWN') &&
          latestState.attempts >= MAX_ATTEMPTS;
        if (timedOut) {
          setNotification({
            type: 'error',
            message: t(
              'paymentConfirmationTimedOut',
              'Payment confirmation timed out. If you completed the USSD prompt, do not retry; refresh the bill or contact the administrator.',
            ),
          });
        }

        setRequestData((prev) => ({
          ...prev,
          originatorConversationId: null,
          requestStatus: timedOut ? null : latestState.lastStatus ?? prev.requestStatus,
        }));
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    bill.uuid,
    closeModal,
    paymentAPIBaseUrl,
    requestData.originatorConversationId,
    requestData.requestStatus,
    setNotification,
    t,
  ]);

  return [requestData, setRequestData];
};
