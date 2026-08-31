import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { RequestStatus } from '../types';

export type EthSwitchPaymentMethod = 'ACCOUNT' | 'QR';

export type EthSwitchIntentStatus = 'ORDER_CREATED' | 'INITIATED' | 'GATEWAY_CONFIRMED' | 'SETTLED' | 'FAILED';

export interface EthSwitchBank {
  name: string;
  BIC: string;
}

export interface EthSwitchOrderPayload {
  billUuid: string;
  lineItemUuids: string[];
  description?: string;
}

export interface EthSwitchInitiatePayload {
  merchantOrderNumber: string;
  payerName: string;
  accountNumber?: string;
  payerDfs: string;
  paymentMethod: EthSwitchPaymentMethod;
}

export interface EthSwitchSubmitPayload {
  billUuid: string;
  lineItemUuids: string[];
  description?: string;
  payerName: string;
  accountNumber?: string;
  payerDfs: string;
  paymentMethod: EthSwitchPaymentMethod;
}

interface EthSwitchOrderResponse {
  intentUuid: string;
  merchantOrderNumber: string;
  paymentRequestId: string;
  amount: number;
  status: EthSwitchIntentStatus;
}

interface EthSwitchInitiateResponse {
  intentUuid: string;
  merchantOrderNumber: string;
  paymentRequestId: string;
  status: EthSwitchIntentStatus;
}

interface EthSwitchStatusResponse {
  intentUuid: string;
  merchantOrderNumber: string;
  paymentRequestId: string;
  status: EthSwitchIntentStatus;
  amount?: number;
  gatewayTransactionId?: string | null;
  lastError?: string | null;
}

interface EthSwitchPaymentErrorResponse {
  success?: boolean;
  errorCode?: string;
  message?: string;
}

const ETHSWITCH_BASE_URL = `${restBaseUrl}/ethiopiaemrcustommodule/ethswitch`;
export const ETHSWITCH_ORDER_URL = `${ETHSWITCH_BASE_URL}/order`;
export const ETHSWITCH_INITIATE_URL = `${ETHSWITCH_BASE_URL}/initiate`;
export const ETHSWITCH_STATUS_URL = `${ETHSWITCH_BASE_URL}/status`;
export const ETHSWITCH_BANKS_URL = `${ETHSWITCH_BASE_URL}/banks`;

export const readableStatusMap = new Map<RequestStatus, string>();
readableStatusMap.set('COMPLETE', 'Complete');
readableStatusMap.set('FAILED', 'Failed');
readableStatusMap.set('INITIATED', 'Waiting for user...');
readableStatusMap.set('NOT-FOUND', 'Request not found');
readableStatusMap.set(
  'SETTLEMENT-FAILED',
  'Payment was received but the bill could not be settled automatically. Do not retry. Please contact the system administrator.',
);

export class EthSwitchPaymentError extends Error {
  merchantOrderNumber?: string;

  constructor(message: string, merchantOrderNumber?: string) {
    super(message);
    this.name = 'EthSwitchPaymentError';
    this.merchantOrderNumber = merchantOrderNumber;
  }
}

const isSettlementFailure = (lastError?: string | null): boolean => {
  if (!lastError) {
    return false;
  }

  const lower = lastError.toLowerCase();
  return (
    lower.includes('bill') ||
    lower.includes('settlement') ||
    lower.includes('line item') ||
    lower.includes('cashier') ||
    lower.includes('payment mode') ||
    lower.includes('payment intent')
  );
};

export const mapEthSwitchIntentStatus = (body: {
  status?: string;
  gatewayTransactionId?: string | null;
  lastError?: string | null;
}): RequestStatus => {
  switch (body.status) {
    case 'SETTLED':
      return 'COMPLETE';
    case 'INITIATED':
    case 'GATEWAY_CONFIRMED':
    case 'ORDER_CREATED':
      return 'INITIATED';
    case 'FAILED':
      if (body.gatewayTransactionId || isSettlementFailure(body.lastError)) {
        return 'SETTLEMENT-FAILED';
      }
      return 'FAILED';
    default:
      return 'UNKNOWN';
  }
};

export const getEthSwitchErrorMessage = (error: unknown, fallback: string): string => {
  const responseBody = (error as { responseBody?: EthSwitchPaymentErrorResponse })?.responseBody;
  if (responseBody?.message) {
    return responseBody.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const getErrorMessage = (err: { message: string }, t) => {
  if (err.message) {
    return err.message;
  }

  return t('unKnownErrorMsg', 'An unknown error occurred');
};

export const normalizeEthSwitchBanks = (payload: unknown): EthSwitchBank[] => {
  let rawList: unknown[] = [];
  if (Array.isArray(payload)) {
    rawList = payload;
  } else if (Array.isArray((payload as { results?: unknown[] })?.results)) {
    rawList = (payload as { results: unknown[] }).results;
  }

  return rawList
    .map((item) => {
      const bank = item as { name?: string; BIC?: string; bic?: string };
      return {
        name: bank.name ?? '',
        BIC: bank.BIC ?? bank.bic ?? '',
      };
    })
    .filter((bank) => Boolean(bank.BIC));
};

export const createEthSwitchOrder = async (payload: EthSwitchOrderPayload): Promise<EthSwitchOrderResponse> => {
  try {
    const response = await openmrsFetch<EthSwitchOrderResponse>(ETHSWITCH_ORDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        billUuid: payload.billUuid,
        lineItemUuids: payload.lineItemUuids,
        ...(payload.description ? { description: payload.description } : {}),
      },
    });

    return response.data;
  } catch (err) {
    throw new Error(getEthSwitchErrorMessage(err, 'Unable to create EthSwitch payment order, please try again later.'));
  }
};

export const initiateEthSwitchPayment = async (
  payload: EthSwitchInitiatePayload,
): Promise<EthSwitchInitiateResponse> => {
  try {
    const body: Record<string, string> = {
      merchantOrderNumber: payload.merchantOrderNumber,
      payerName: payload.payerName,
      payerDfs: payload.payerDfs,
      paymentMethod: payload.paymentMethod,
    };

    if (payload.accountNumber) {
      body.accountNumber = payload.accountNumber;
    }

    const response = await openmrsFetch<EthSwitchInitiateResponse>(ETHSWITCH_INITIATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    return response.data;
  } catch (err) {
    throw new Error(getEthSwitchErrorMessage(err, 'Unable to initiate EthSwitch payment, please try again later.'));
  }
};

/**
 * Creates an EthSwitch order (unless one already exists for this attempt) and
 * then initiates payment. If order creation succeeded but initiate failed, the
 * thrown EthSwitchPaymentError includes merchantOrderNumber so the next click
 * retries initiate only.
 */
export const submitEthSwitchPayment = async (
  payload: EthSwitchSubmitPayload,
  existingMerchantOrderNumber?: string | null,
): Promise<{ merchantOrderNumber: string }> => {
  let merchantOrderNumber = existingMerchantOrderNumber ?? null;

  try {
    if (!merchantOrderNumber) {
      const order = await createEthSwitchOrder({
        billUuid: payload.billUuid,
        lineItemUuids: payload.lineItemUuids,
        description: payload.description,
      });
      merchantOrderNumber = order.merchantOrderNumber;
    }

    await initiateEthSwitchPayment({
      merchantOrderNumber,
      payerName: payload.payerName,
      accountNumber: payload.accountNumber,
      payerDfs: payload.payerDfs,
      paymentMethod: payload.paymentMethod,
    });

    return { merchantOrderNumber };
  } catch (err) {
    throw new EthSwitchPaymentError(
      getEthSwitchErrorMessage(err, 'Unable to initiate EthSwitch payment, please try again later.'),
      merchantOrderNumber ?? undefined,
    );
  }
};

export const getEthSwitchRequestStatus = async (
  merchantOrderNumber: string,
): Promise<{ status: RequestStatus; referenceCode?: string; settlementError?: string }> => {
  try {
    const url = `${ETHSWITCH_STATUS_URL}?merchantOrderNumber=${encodeURIComponent(merchantOrderNumber)}`;
    const response = await openmrsFetch<EthSwitchStatusResponse>(url);
    const body = response.data;

    return {
      status: mapEthSwitchIntentStatus(body),
      referenceCode: body.gatewayTransactionId ?? undefined,
      settlementError: body.lastError ?? undefined,
    };
  } catch (error) {
    const errorCode = (error as { responseBody?: EthSwitchPaymentErrorResponse })?.responseBody?.errorCode;
    if (errorCode === 'INTENT_NOT_FOUND') {
      return { status: 'NOT-FOUND' };
    }
    return { status: 'UNKNOWN' };
  }
};

export const listBanks = async (): Promise<EthSwitchBank[]> => {
  try {
    const response = await openmrsFetch(ETHSWITCH_BANKS_URL);
    return normalizeEthSwitchBanks(response.data);
  } catch (err) {
    throw new Error(getEthSwitchErrorMessage(err, 'Unable to load banks.'));
  }
};

export const useEthSwitchBanks = () => {
  const { data, error, isLoading } = useSWR(ETHSWITCH_BANKS_URL, listBanks);

  return {
    banks: data ?? [],
    error,
    isLoading,
    errorMessage: error ? getEthSwitchErrorMessage(error, 'Unable to load banks.') : null,
  };
};
