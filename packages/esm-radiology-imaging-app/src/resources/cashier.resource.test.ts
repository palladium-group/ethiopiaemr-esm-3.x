import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  deriveWorklistPaymentGate,
  ensureOrderPaymentAllowsWorklist,
  interpolateBillingStatusUrl,
  resolveOrderPaymentStatus,
  UnpaidOrderError,
  type BillLineItem,
} from './cashier.resource';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

const defaultUrl = '${restBaseUrl}/cashier/billLineItem?orderUuid=${orderUuid}&v=full';

describe('interpolateBillingStatusUrl', () => {
  it('substitutes restBaseUrl and orderUuid and always requests v=full', () => {
    const url = interpolateBillingStatusUrl(defaultUrl, 'ab01768a-2cb1-484c-8047-b0f5783f6caf');

    expect(url).toBe(`${restBaseUrl}/cashier/billLineItem?orderUuid=ab01768a-2cb1-484c-8047-b0f5783f6caf&v=full`);
  });
});

describe('resolveOrderPaymentStatus', () => {
  it('treats PAID line items as paid', () => {
    expect(resolveOrderPaymentStatus([{ uuid: '1', paymentStatus: 'PAID' }])).toEqual({
      isPaid: true,
      paymentStatus: 'PAID',
    });
  });

  it('treats EXEMPTED line items as paid', () => {
    expect(resolveOrderPaymentStatus([{ uuid: '1', paymentStatus: 'EXEMPTED' }])).toEqual({
      isPaid: true,
      paymentStatus: 'EXEMPTED',
    });
  });

  it('treats PENDING line items as unpaid', () => {
    expect(resolveOrderPaymentStatus([{ uuid: '1', paymentStatus: 'PENDING' }])).toEqual({
      isPaid: false,
      paymentStatus: 'PENDING',
    });
  });

  it('treats POSTED line items as unpaid', () => {
    expect(resolveOrderPaymentStatus([{ uuid: '1', paymentStatus: 'POSTED' }])).toEqual({
      isPaid: false,
      paymentStatus: 'POSTED',
    });
  });

  it('treats empty results as unpaid', () => {
    expect(resolveOrderPaymentStatus([])).toEqual({ isPaid: false, paymentStatus: null });
    expect(resolveOrderPaymentStatus(null)).toEqual({ isPaid: false, paymentStatus: null });
  });

  it('ignores voided line items', () => {
    const items: Array<BillLineItem> = [
      { uuid: 'voided', paymentStatus: 'PAID', voided: true },
      { uuid: 'active', paymentStatus: 'PENDING' },
    ];

    expect(resolveOrderPaymentStatus(items)).toEqual({ isPaid: false, paymentStatus: 'PENDING' });
  });

  it('allows the order when any non-voided line item is PAID or EXEMPTED', () => {
    expect(
      resolveOrderPaymentStatus([
        { uuid: 'pending', paymentStatus: 'PENDING' },
        { uuid: 'paid', paymentStatus: 'paid' },
      ]),
    ).toEqual({ isPaid: true, paymentStatus: 'paid' });
  });
});

describe('ensureOrderPaymentAllowsWorklist', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
  });

  it('skips the cashier check when enforceBillPayment is false', async () => {
    await ensureOrderPaymentAllowsWorklist('order-1', {
      enforceBillPayment: false,
      billingStatusQueryUrl: defaultUrl,
    });

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('resolves when the line item is PAID', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ uuid: 'li-1', paymentStatus: 'PAID' }] },
    } as never);

    await expect(
      ensureOrderPaymentAllowsWorklist('order-1', {
        enforceBillPayment: true,
        billingStatusQueryUrl: defaultUrl,
      }),
    ).resolves.toBeUndefined();
  });

  it('throws UnpaidOrderError when the line item is PENDING', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ uuid: 'li-1', paymentStatus: 'PENDING', settlementStatus: 'UNPAID' }] },
    } as never);

    await expect(
      ensureOrderPaymentAllowsWorklist('order-1', {
        enforceBillPayment: true,
        billingStatusQueryUrl: defaultUrl,
      }),
    ).rejects.toBeInstanceOf(UnpaidOrderError);
  });

  it('throws UnpaidOrderError when no line items are returned', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [] } } as never);

    await expect(
      ensureOrderPaymentAllowsWorklist('order-1', {
        enforceBillPayment: true,
        billingStatusQueryUrl: defaultUrl,
      }),
    ).rejects.toBeInstanceOf(UnpaidOrderError);
  });
});

describe('deriveWorklistPaymentGate', () => {
  it('does not treat a fetch failure as unpaid', () => {
    expect(
      deriveWorklistPaymentGate({
        enforceBillPayment: true,
        isLoading: false,
        error: new Error('cashier 500'),
        isPaid: false,
      }),
    ).toEqual({
      canCreateWorklist: false,
      isUnpaid: false,
      hasPaymentStatusError: true,
    });
  });

  it('marks a successful unpaid fetch as unpaid, not as a check error', () => {
    expect(
      deriveWorklistPaymentGate({
        enforceBillPayment: true,
        isLoading: false,
        error: undefined,
        isPaid: false,
      }),
    ).toEqual({
      canCreateWorklist: false,
      isUnpaid: true,
      hasPaymentStatusError: false,
    });
  });

  it('allows worklist creation when paid', () => {
    expect(
      deriveWorklistPaymentGate({
        enforceBillPayment: true,
        isLoading: false,
        error: undefined,
        isPaid: true,
      }),
    ).toEqual({
      canCreateWorklist: true,
      isUnpaid: false,
      hasPaymentStatusError: false,
    });
  });
});
