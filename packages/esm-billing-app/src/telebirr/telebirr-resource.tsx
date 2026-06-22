import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { RequestStatus } from '../types';

export interface TelebirrInitiatePayload {
  billUuid: string;
  lineItemUuids: string[];
  mobileNumber: string;
}

interface TelebirrInitiateResponse {
  intentUuid: string;
  originatorConversationId: string;
  amount: number;
  status: PaymentIntentStatus;
}

type PaymentIntentStatus = 'INITIATED' | 'SETTLED' | 'FAILED';

interface TelebirrStatusResponse {
  intentUuid: string;
  originatorConversationId: string;
  status: PaymentIntentStatus;
  amount?: number;
  telebirrTransactionId?: string | null;
  lastError?: string | null;
}

interface TelebirrPaymentErrorResponse {
  success?: boolean;
  errorCode?: string;
  message?: string;
}

const TELEBIRR_INITIATE_URL = `${restBaseUrl}/ethiopiaemrcustommodule/telebirr/initiate`;
const TELEBIRR_STATUS_URL = `${restBaseUrl}/ethiopiaemrcustommodule/telebirr/status`;

export const readableStatusMap = new Map<RequestStatus, string>();
readableStatusMap.set('COMPLETE', 'Complete');
readableStatusMap.set('FAILED', 'Failed');
readableStatusMap.set('INITIATED', 'Waiting for user...');
readableStatusMap.set('NOT-FOUND', 'Request not found');
readableStatusMap.set(
  'SETTLEMENT-FAILED',
  'Payment was received but the bill could not be settled automatically. Do not retry. Please contact the system administrator.',
);

const isSettlementFailure = (lastError?: string | null): boolean => {
  if (!lastError) {
    return false;
  }

  const lower = lastError.toLowerCase();
  return (
    lower.includes('bill') ||
    lower.includes('settlement') ||
    lower.includes('line item') ||
    lower.includes('payment mode') ||
    lower.includes('cashier') ||
    lower.includes('payment intent')
  );
};

const mapIntentStatus = (body: TelebirrStatusResponse): RequestStatus => {
  switch (body.status) {
    case 'SETTLED':
      return 'COMPLETE';
    case 'INITIATED':
      return 'INITIATED';
    case 'FAILED':
      if (body.telebirrTransactionId || isSettlementFailure(body.lastError)) {
        return 'SETTLEMENT-FAILED';
      }
      return 'FAILED';
    default:
      return 'UNKNOWN';
  }
};

const getTelebirrErrorMessage = (error: unknown, fallback: string): string => {
  const responseBody = (error as { responseBody?: TelebirrPaymentErrorResponse })?.responseBody;
  if (responseBody?.message) {
    return responseBody.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const initiateTelebirrPayment = async (
  payload: TelebirrInitiatePayload,
  setNotification: (notification: { type: 'error' | 'success'; message: string }) => void,
): Promise<string | undefined> => {
  try {
    const response = await openmrsFetch<TelebirrInitiateResponse>(TELEBIRR_INITIATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        billUuid: payload.billUuid,
        lineItemUuids: payload.lineItemUuids,
        mobileNumber: payload.mobileNumber,
      },
    });

    setNotification({ message: 'Telebirr payment initiated successfully', type: 'success' });
    return response.data.originatorConversationId;
  } catch (err) {
    setNotification({
      message: getTelebirrErrorMessage(err, 'Unable to initiate Telebirr payment, please try again later.'),
      type: 'error',
    });
  }
};

export const getRequestStatus = async (
  originatorConversationId: string,
): Promise<{ status: RequestStatus; referenceCode?: string; settlementError?: string }> => {
  try {
    const url = `${TELEBIRR_STATUS_URL}?originatorConversationId=${encodeURIComponent(originatorConversationId)}`;
    const response = await openmrsFetch<TelebirrStatusResponse>(url);
    const body = response.data;

    return {
      status: mapIntentStatus(body),
      referenceCode: body.telebirrTransactionId ?? undefined,
      settlementError: body.lastError ?? undefined,
    };
  } catch (error) {
    const errorCode = (error as { responseBody?: TelebirrPaymentErrorResponse })?.responseBody?.errorCode;
    if (errorCode === 'INTENT_NOT_FOUND') {
      return { status: 'NOT-FOUND' };
    }
    return { status: 'UNKNOWN' };
  }
};

export const getErrorMessage = (err: { message: string }, t) => {
  if (err.message) {
    return err.message;
  }

  return t('unKnownErrorMsg', 'An unknown error occurred');
};
