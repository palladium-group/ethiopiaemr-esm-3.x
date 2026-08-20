import { showSnackbar } from '@openmrs/esm-framework';
import { SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { from, interval, of } from 'rxjs';
import { catchError, scan, startWith, switchMap, take, takeWhile } from 'rxjs/operators';
import { getErrorMessage, getEthSwitchRequestStatus, readableStatusMap } from '../ethswitch/ethswitch-resource';
import { MappedBill, RequestStatus } from '../types';
import { waitForASecond } from '../utils';

type RequestData = {
  merchantOrderNumber: string | null;
  requestStatus: RequestStatus | null;
};

type PollState = {
  attempts: number;
  lastStatus: RequestStatus | null;
  lastReferenceCode?: string;
  lastSettlementError?: string;
};

const TERMINAL_STATUSES: RequestStatus[] = ['COMPLETE', 'FAILED', 'NOT-FOUND', 'SETTLEMENT-FAILED'];

/**
 * Polls the custom module for the authoritative status of an EthSwitch payment
 * intent. Settlement happens server-side in OpenMRS, so the browser only
 * observes the outcome and refreshes the bill view; it never settles the bill
 * itself.
 */
export const useEthSwitchRequestStatus = (
  setNotification: React.Dispatch<SetStateAction<{ type: 'error' | 'success'; message: string } | null>>,
  closeModal: () => void,
  bill: MappedBill,
): [RequestData, React.Dispatch<React.SetStateAction<RequestData | null>>] => {
  const { t } = useTranslation();

  const POLL_INTERVAL_MS = 6000;
  const MAX_ATTEMPTS = 15;

  const [requestData, setRequestData] = useState<RequestData>({
    merchantOrderNumber: null,
    requestStatus: null,
  });

  useEffect(() => {
    if (!requestData.merchantOrderNumber) {
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
        from(getEthSwitchRequestStatus(requestData.merchantOrderNumber)).pipe(
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
            merchantOrderNumber: null,
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
          setRequestData((prev) => ({
            ...prev,
            merchantOrderNumber: null,
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
            merchantOrderNumber: null,
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
              'ethSwitchPaymentConfirmationTimedOut',
              'Payment confirmation timed out. If the patient approved the payment in their bank or wallet app, do not retry; refresh the bill or contact the administrator.',
            ),
          });
        }

        setRequestData((prev) => ({
          ...prev,
          merchantOrderNumber: null,
          requestStatus: timedOut ? null : latestState.lastStatus ?? prev.requestStatus,
        }));
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [bill.uuid, closeModal, requestData.merchantOrderNumber, requestData.requestStatus, setNotification, t]);

  return [requestData, setRequestData];
};
