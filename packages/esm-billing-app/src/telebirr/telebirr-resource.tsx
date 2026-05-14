import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { RequestStatus } from '../types';

interface TelebirrPaymentResponse {
  success: boolean;
  responseCode: string;
  responseDesc: string;
  serviceStatus: string;
  conversationId: string;
  originatorConversationId: string;
}

interface TelebirrCallbackResponse {
  id: number;
  provider: string;
  conversation_id: string;
  originator_conversation_id: string;
  transaction_id: string;
  result_code: string; // 0: Success, anything else is failure
  result_description: string;
}

export const readableStatusMap = new Map<RequestStatus, string>();
readableStatusMap.set('COMPLETE', 'Complete');
readableStatusMap.set('FAILED', 'Failed');
readableStatusMap.set('INITIATED', 'Waiting for user...');
readableStatusMap.set('NOT-FOUND', 'Request not found');

export const initiateTelebirrPayment = async (
  payload: {
    conversationId: string;
    mobileNumber: string;
    amount: string;
  },
  setNotification: (notification: { type: 'error' | 'success'; message: string }) => void,
  paymentAPIBaseUrl: string,
): Promise<string> => {
  try {
    const url = `${paymentAPIBaseUrl}/payments`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: payload.conversationId,
        mobileNumber: payload.mobileNumber,
        amount: payload.amount,
      }),
    });

    if (res.ok) {
      const response: TelebirrPaymentResponse = await res.json();
      setNotification({ message: 'Telebirr payment initiated successfully', type: 'success' });
      return response.originatorConversationId;
    }

    if (!res.ok) {
      throw new Error('Unable to initiate Telebirr payment, please try again later.');
    }
  } catch (err) {
    setNotification({
      message: 'Unable to initiate Telebirr payment, please try again later.',
      type: 'error',
    });
  }
};

export const getRequestStatus = async (
  originatorConversationId: string,
  paymentAPIBaseUrl: string,
): Promise<{ status: RequestStatus; referenceCode?: string }> => {
  try {
    const response: Response = await fetch(
      `${paymentAPIBaseUrl}/callbacks?originator_conversation_id=${originatorConversationId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);

      if (response.statusText) {
        error.message = response.statusText;
      }
      return { status: 'FAILED', referenceCode: undefined };
    }

    const telebirrCallbackResponse: TelebirrCallbackResponse = await response.json();

    if (telebirrCallbackResponse.result_code === '0') {
      return { status: 'COMPLETE', referenceCode: telebirrCallbackResponse.transaction_id };
    }

    // If the result code is not 0, return failed status
    return { status: 'FAILED', referenceCode: undefined };
  } catch (error) {
    // return failed status
    const response: { status: RequestStatus; referenceCode?: string } = {
      status: 'UNKNOWN',
      referenceCode: undefined,
    };
    return response;
  }
};

export const getErrorMessage = (err: { message: string }, t) => {
  if (err.message) {
    return err.message;
  }

  return t('unKnownErrorMsg', 'An unknown error occurred');
};
