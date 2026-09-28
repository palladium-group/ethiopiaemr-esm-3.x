import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useConfig } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import { usePaymentModes } from '../mru/billing-information/hooks/usePaymentModes';
import { useQueueEntryBillingStatus } from './useQueueEntryBillingStatus';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, options?: any) => {
      if (options?.mode) {
        return fallback.replace('{{mode}}', options.mode);
      }
      return fallback;
    },
  }),
}));

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: jest.fn(),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
  showSnackbar: jest.fn(),
}));

jest.mock('swr', () => jest.fn());

jest.mock('../mru/billing-information/hooks/usePaymentModes', () => ({
  usePaymentModes: jest.fn(),
}));

const PAYMENT_METHOD_ATTRIBUTE_TYPE = 'payment-method-attribute-type';
const CASH_PAYMENT_MODE_UUID = 'cash-payment-mode-uuid';
const CBHI_PAYMENT_MODE_UUID = 'cbhi-payment-mode-uuid';
const CREDIT_PAYMENT_MODE_UUID = 'credit-payment-mode-uuid';

describe('useQueueEntryBillingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConfig as jest.Mock).mockReturnValue({
      billingVisitAttributeTypes: {
        paymentMethod: PAYMENT_METHOD_ATTRIBUTE_TYPE,
      },
    });

    (usePaymentModes as jest.Mock).mockReturnValue({
      billingTypes: [
        { uuid: CASH_PAYMENT_MODE_UUID, name: 'Cash / Paying' },
        { uuid: CBHI_PAYMENT_MODE_UUID, name: 'CBHI' },
        { uuid: CREDIT_PAYMENT_MODE_UUID, name: 'Credit Company' },
      ],
      isLoading: false,
    });

    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
    });
  });

  it('blocks when queueEntry has no active visit', () => {
    const queueEntry = { uuid: 'q1', patient: { uuid: 'p1' } } as unknown as QueueEntry;
    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(false);
    expect(result.current.status).toBe('NO_PAYMENT_METHOD');
    expect(result.current.badgeType).toBe('gray');
  });

  it('blocks when visit has no paymentMethod attribute attached', () => {
    const queueEntry = {
      uuid: 'q1',
      patient: { uuid: 'p1' },
      visit: {
        uuid: 'v1',
        attributes: [],
      },
    } as unknown as QueueEntry;

    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(false);
    expect(result.current.status).toBe('NO_PAYMENT_METHOD');
    expect(result.current.badgeType).toBe('gray');
    expect(result.current.message).toContain('Patient must visit the MRU desk');
  });

  it('clears immediately when a non-cash (CBHI) payment method is attached', () => {
    const queueEntry = {
      uuid: 'q1',
      patient: { uuid: 'p1' },
      visit: {
        uuid: 'v1',
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE },
            value: CBHI_PAYMENT_MODE_UUID,
          },
        ],
      },
    } as unknown as QueueEntry;

    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(true);
    expect(result.current.status).toBe('CLEARED');
    expect(result.current.badgeType).toBe('green');
    expect(result.current.badgeText).toBe('Cleared (CBHI)');
  });

  it('clears immediately when a Credit payment method is attached', () => {
    const queueEntry = {
      uuid: 'q1',
      patient: { uuid: 'p1' },
      visit: {
        uuid: 'v1',
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE },
            value: CREDIT_PAYMENT_MODE_UUID,
          },
        ],
      },
    } as unknown as QueueEntry;

    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(true);
    expect(result.current.status).toBe('CLEARED');
    expect(result.current.badgeType).toBe('green');
  });

  it('blocks Cash patient when no consultation fee bill exists', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
    });

    const queueEntry = {
      uuid: 'q1',
      patient: { uuid: 'p1' },
      visit: {
        uuid: 'v1',
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE },
            value: CASH_PAYMENT_MODE_UUID,
          },
        ],
      },
    } as unknown as QueueEntry;

    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(false);
    expect(result.current.status).toBe('NO_CONSULTATION_BILL');
    expect(result.current.badgeType).toBe('high-contrast');
    expect(result.current.message).toContain('Consultation fee has not been created');
  });

  it('blocks Cash patient when bill is unpaid or pending payment', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'bill-1',
              voided: false,
              status: 'PENDING',
              balance: 150,
              lineItems: [{ uuid: 'item-1', paymentStatus: 'PENDING', price: 150, quantity: 1 }],
            },
          ],
        },
      },
      isLoading: false,
    });

    const queueEntry = {
      uuid: 'q1',
      patient: { uuid: 'p1' },
      visit: {
        uuid: 'v1',
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE },
            value: CASH_PAYMENT_MODE_UUID,
          },
        ],
      },
    } as unknown as QueueEntry;

    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(false);
    expect(result.current.status).toBe('PENDING_PAYMENT');
    expect(result.current.badgeType).toBe('red');
    expect(result.current.message).toContain('Consultation fee payment is pending');
  });

  it('clears Cash patient when consultation fee bill is fully paid', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'bill-1',
              voided: false,
              status: 'PAID',
              balance: 0,
              lineItems: [{ uuid: 'item-1', paymentStatus: 'PAID', price: 150, quantity: 1 }],
            },
          ],
        },
      },
      isLoading: false,
    });

    const queueEntry = {
      uuid: 'q1',
      patient: { uuid: 'p1' },
      visit: {
        uuid: 'v1',
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE },
            value: CASH_PAYMENT_MODE_UUID,
          },
        ],
      },
    } as unknown as QueueEntry;

    const { result } = renderHook(() => useQueueEntryBillingStatus(queueEntry));

    expect(result.current.isCleared).toBe(true);
    expect(result.current.status).toBe('CLEARED');
    expect(result.current.badgeType).toBe('green');
    expect(result.current.badgeText).toBe('Paid');
  });
});
