import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  createEthSwitchOrder,
  ETHSWITCH_INITIATE_URL,
  ETHSWITCH_ORDER_URL,
  ETHSWITCH_STATUS_URL,
  EthSwitchPaymentError,
  getEthSwitchErrorMessage,
  getEthSwitchRequestStatus,
  initiateEthSwitchPayment,
  mapEthSwitchIntentStatus,
  normalizeEthSwitchBanks,
  submitEthSwitchPayment,
} from './ethswitch-resource';

jest.mock('@openmrs/esm-framework', () => ({
  restBaseUrl: '/ws/rest/v1',
  openmrsFetch: jest.fn(),
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;

const orderPayload = {
  billUuid: 'bill-uuid',
  lineItemUuids: ['line-1', 'line-2'],
  description: 'Bill REC-1',
};

const initiateFields = {
  payerName: 'John Doe',
  accountNumber: '1234567890',
  payerDfs: 'CBETETAA',
  paymentMethod: 'ACCOUNT' as const,
};

const orderResponse = {
  intentUuid: 'intent-1',
  merchantOrderNumber: 'MON-123',
  paymentRequestId: 'pr-1',
  amount: 250,
  status: 'ORDER_CREATED' as const,
};

describe('mapEthSwitchIntentStatus', () => {
  it('maps SETTLED to COMPLETE', () => {
    expect(mapEthSwitchIntentStatus({ status: 'SETTLED' })).toBe('COMPLETE');
  });

  it('maps in-progress statuses to INITIATED so the UI keeps polling', () => {
    expect(mapEthSwitchIntentStatus({ status: 'INITIATED' })).toBe('INITIATED');
    expect(mapEthSwitchIntentStatus({ status: 'GATEWAY_CONFIRMED' })).toBe('INITIATED');
    expect(mapEthSwitchIntentStatus({ status: 'ORDER_CREATED' })).toBe('INITIATED');
  });

  it('maps FAILED with a gateway transaction id to SETTLEMENT-FAILED', () => {
    expect(
      mapEthSwitchIntentStatus({
        status: 'FAILED',
        gatewayTransactionId: 'GW-99',
        lastError: 'timeout',
      }),
    ).toBe('SETTLEMENT-FAILED');
  });

  it('maps FAILED with a settlement-like lastError to SETTLEMENT-FAILED', () => {
    expect(
      mapEthSwitchIntentStatus({
        status: 'FAILED',
        lastError: 'Cashier bill settlement failed',
      }),
    ).toBe('SETTLEMENT-FAILED');
  });

  it('maps other FAILED statuses to FAILED', () => {
    expect(mapEthSwitchIntentStatus({ status: 'FAILED', lastError: 'User declined' })).toBe('FAILED');
  });

  it('maps unknown statuses to UNKNOWN', () => {
    expect(mapEthSwitchIntentStatus({ status: 'SOMETHING_ELSE' })).toBe('UNKNOWN');
  });
});

describe('normalizeEthSwitchBanks', () => {
  it('accepts BIC and bic', () => {
    expect(
      normalizeEthSwitchBanks([
        { name: 'Commercial Bank of Ethiopia', BIC: 'CBETETAA' },
        { name: 'Awash Bank', bic: 'AWINETAA' },
      ]),
    ).toEqual([
      { name: 'Commercial Bank of Ethiopia', BIC: 'CBETETAA' },
      { name: 'Awash Bank', BIC: 'AWINETAA' },
    ]);
  });

  it('reads banks from a results wrapper', () => {
    expect(normalizeEthSwitchBanks({ results: [{ name: 'Dashen', BIC: 'DASHETAA' }] })).toEqual([
      { name: 'Dashen', BIC: 'DASHETAA' },
    ]);
  });
});

describe('getEthSwitchErrorMessage', () => {
  it('surfaces the backend message from the error body', () => {
    expect(
      getEthSwitchErrorMessage(
        { responseBody: { success: false, errorCode: 'DUPLICATE_INTENT', message: 'Intent already exists' } },
        'fallback',
      ),
    ).toBe('Intent already exists');
  });
});

describe('EthSwitch resource API mapping', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  it('creates an order without posting an amount', async () => {
    mockedOpenmrsFetch.mockResolvedValueOnce({ data: orderResponse } as never);

    await createEthSwitchOrder(orderPayload);

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/ethiopiaemrcustommodule/ethswitch/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        billUuid: 'bill-uuid',
        lineItemUuids: ['line-1', 'line-2'],
        description: 'Bill REC-1',
      },
    });
    expect(JSON.stringify(mockedOpenmrsFetch.mock.calls[0][1]?.body)).not.toMatch(/amount/i);
  });

  it('initiates payment without posting an amount', async () => {
    mockedOpenmrsFetch.mockResolvedValueOnce({
      data: { ...orderResponse, status: 'INITIATED' },
    } as never);

    await initiateEthSwitchPayment({
      merchantOrderNumber: 'MON-123',
      ...initiateFields,
    });

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/ethiopiaemrcustommodule/ethswitch/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        merchantOrderNumber: 'MON-123',
        payerName: 'John Doe',
        payerDfs: 'CBETETAA',
        paymentMethod: 'ACCOUNT',
        accountNumber: '1234567890',
      },
    });
    expect(JSON.stringify(mockedOpenmrsFetch.mock.calls[0][1]?.body)).not.toMatch(/amount/i);
  });

  it('omits accountNumber for QR when it is empty', async () => {
    mockedOpenmrsFetch.mockResolvedValueOnce({
      data: { ...orderResponse, status: 'INITIATED' },
    } as never);

    await initiateEthSwitchPayment({
      merchantOrderNumber: 'MON-123',
      payerName: 'John Doe',
      payerDfs: 'CBETETAA',
      paymentMethod: 'QR',
    });

    expect(mockedOpenmrsFetch.mock.calls[0][1]?.body).toEqual({
      merchantOrderNumber: 'MON-123',
      payerName: 'John Doe',
      payerDfs: 'CBETETAA',
      paymentMethod: 'QR',
    });
  });

  it('polls status by merchantOrderNumber', async () => {
    mockedOpenmrsFetch.mockResolvedValueOnce({
      data: {
        ...orderResponse,
        status: 'SETTLED',
        gatewayTransactionId: 'GW-1',
      },
    } as never);

    const result = await getEthSwitchRequestStatus('MON-123');

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/ethiopiaemrcustommodule/ethswitch/status?merchantOrderNumber=MON-123`,
    );
    expect(result).toEqual({
      status: 'COMPLETE',
      referenceCode: 'GW-1',
      settlementError: undefined,
    });
  });

  it('maps INTENT_NOT_FOUND to NOT-FOUND', async () => {
    mockedOpenmrsFetch.mockRejectedValueOnce({
      responseBody: { errorCode: 'INTENT_NOT_FOUND', message: 'Not found' },
    });

    await expect(getEthSwitchRequestStatus('missing')).resolves.toEqual({ status: 'NOT-FOUND' });
  });
});

describe('submitEthSwitchPayment retry initiate only', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  it('keeps merchantOrderNumber and retries initiate only after create succeeds and initiate fails', async () => {
    mockedOpenmrsFetch
      .mockResolvedValueOnce({ data: orderResponse } as never)
      .mockRejectedValueOnce({
        responseBody: { success: false, errorCode: 'GATEWAY_ERROR', message: 'Bank unavailable' },
      })
      .mockResolvedValueOnce({ data: { ...orderResponse, status: 'INITIATED' } } as never);

    const payload = {
      ...orderPayload,
      ...initiateFields,
    };

    await expect(submitEthSwitchPayment(payload)).rejects.toEqual(
      expect.objectContaining({
        name: 'EthSwitchPaymentError',
        message: 'Bank unavailable',
        merchantOrderNumber: 'MON-123',
      }),
    );

    expect(mockedOpenmrsFetch).toHaveBeenCalledTimes(2);
    expect(mockedOpenmrsFetch.mock.calls[0][0]).toBe(ETHSWITCH_ORDER_URL);
    expect(mockedOpenmrsFetch.mock.calls[1][0]).toBe(ETHSWITCH_INITIATE_URL);

    await expect(submitEthSwitchPayment(payload, 'MON-123')).resolves.toEqual({
      merchantOrderNumber: 'MON-123',
      qrCode: undefined,
      qrCodeData: undefined,
    });

    expect(mockedOpenmrsFetch).toHaveBeenCalledTimes(3);
    expect(mockedOpenmrsFetch.mock.calls[2][0]).toBe(ETHSWITCH_INITIATE_URL);
    expect(mockedOpenmrsFetch.mock.calls.map((call) => call[0])).not.toContain(ETHSWITCH_STATUS_URL);
    expect(mockedOpenmrsFetch.mock.calls.filter((call) => call[0] === ETHSWITCH_ORDER_URL)).toHaveLength(1);
  });

  it('returns qr payload from initiate for QR payments', async () => {
    mockedOpenmrsFetch.mockResolvedValueOnce({ data: orderResponse } as never).mockResolvedValueOnce({
      data: {
        ...orderResponse,
        status: 'INITIATED',
        qrCode: 'jpeg-base64',
        qrCodeData: '000201010211',
      },
    } as never);

    await expect(
      submitEthSwitchPayment({
        ...orderPayload,
        payerName: 'John Doe',
        payerDfs: 'AXUMETAA',
        paymentMethod: 'QR',
      }),
    ).resolves.toEqual({
      merchantOrderNumber: 'MON-123',
      qrCode: 'jpeg-base64',
      qrCodeData: '000201010211',
    });
  });
});

describe('EthSwitchPaymentError', () => {
  it('preserves merchantOrderNumber for initiate retry', () => {
    const error = new EthSwitchPaymentError('Bank unavailable', 'MON-123');
    expect(error).toBeInstanceOf(Error);
    expect(error.merchantOrderNumber).toBe('MON-123');
  });
});
