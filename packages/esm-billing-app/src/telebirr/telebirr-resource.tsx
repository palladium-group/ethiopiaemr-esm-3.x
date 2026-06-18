import { RequestStatus } from '../types';

export interface TelebirrInitiatePayload {
  billUuid: string;
  lineItemUuids: string[];
  mobileNumber: string;
}

interface TelebirrInitiateResponse {
  success: boolean;
  responseCode: string;
  responseDesc: string;
  serviceStatus: string;
  conversationId?: string;
  originatorConversationId: string;
  amount: number;
  billUuid: string;
}

// Raw payment intent status as reported by the middleware.
type PaymentIntentStatus = 'INITIATED' | 'COMPLETE' | 'FAILED' | 'SETTLED' | 'SETTLEMENT_FAILED' | 'NOT_FOUND';

interface TelebirrStatusResponse {
  status: PaymentIntentStatus;
  referenceCode?: string | null;
  settlementError?: string | null;
}

export const readableStatusMap = new Map<RequestStatus, string>();
readableStatusMap.set('COMPLETE', 'Complete');
readableStatusMap.set('FAILED', 'Failed');
readableStatusMap.set('INITIATED', 'Waiting for user...');
readableStatusMap.set('NOT-FOUND', 'Request not found');
readableStatusMap.set(
  'SETTLEMENT-FAILED',
  'Payment was received but the bill could not be settled automatically. Do not retry. Please contact the system administrator.',
);

const mapIntentStatus = (status: PaymentIntentStatus): RequestStatus => {
  switch (status) {
    case 'SETTLED':
      return 'COMPLETE';
    case 'FAILED':
      return 'FAILED';
    case 'SETTLEMENT_FAILED':
      return 'SETTLEMENT-FAILED';
    case 'NOT_FOUND':
      return 'NOT-FOUND';
    case 'INITIATED':
    case 'COMPLETE':
      // COMPLETE here means Telebirr confirmed but OpenMRS settlement is still
      // pending, so keep waiting until the intent reaches SETTLED.
      return 'INITIATED';
    default:
      return 'UNKNOWN';
  }
};

export const initiateTelebirrPayment = async (
  payload: TelebirrInitiatePayload,
  setNotification: (notification: { type: 'error' | 'success'; message: string }) => void,
  paymentAPIBaseUrl: string,
): Promise<string | undefined> => {
  try {
    const url = `${paymentAPIBaseUrl}/payments/telebirr/initiate`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billUuid: payload.billUuid,
        lineItemUuids: payload.lineItemUuids,
        mobileNumber: payload.mobileNumber,
      }),
    });

    if (res.ok) {
      const response: TelebirrInitiateResponse = await res.json();
      setNotification({ message: 'Telebirr payment initiated successfully', type: 'success' });
      return response.originatorConversationId;
    }

    const errorBody = await res.json().catch(() => null);
    const message = errorBody?.message ?? 'Unable to initiate Telebirr payment, please try again later.';
    throw new Error(message);
  } catch (err) {
    setNotification({
      message:
        err instanceof Error && err.message
          ? err.message
          : 'Unable to initiate Telebirr payment, please try again later.',
      type: 'error',
    });
  }
};

export const getRequestStatus = async (
  originatorConversationId: string,
  paymentAPIBaseUrl: string,
): Promise<{ status: RequestStatus; referenceCode?: string; settlementError?: string }> => {
  try {
    const response = await fetch(
      `${paymentAPIBaseUrl}/payments/telebirr/status?originatorConversationId=${encodeURIComponent(
        originatorConversationId,
      )}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.status === 404) {
      return { status: 'NOT-FOUND' };
    }

    if (!response.ok) {
      return { status: 'UNKNOWN' };
    }

    const body: TelebirrStatusResponse = await response.json();
    return {
      status: mapIntentStatus(body.status),
      referenceCode: body.referenceCode ?? undefined,
      settlementError: body.settlementError ?? undefined,
    };
  } catch (error) {
    return { status: 'UNKNOWN' };
  }
};

export const getErrorMessage = (err: { message: string }, t) => {
  if (err.message) {
    return err.message;
  }

  return t('unKnownErrorMsg', 'An unknown error occurred');
};
