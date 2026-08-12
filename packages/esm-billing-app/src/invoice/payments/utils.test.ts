import { PaymentStatus } from '../../types';
import { createLineItemPaymentPayload, getPayableLineItemUuids } from './utils';

describe('getPayableLineItemUuids', () => {
  it('returns only unpaid non-exempt line uuids', () => {
    const uuids = getPayableLineItemUuids([
      { uuid: 'a', paymentStatus: PaymentStatus.PENDING },
      { uuid: 'b', paymentStatus: PaymentStatus.PAID },
      { uuid: 'c', paymentStatus: PaymentStatus.EXEMPTED },
      { uuid: 'd', paymentStatus: PaymentStatus.PENDING },
    ]);
    expect(uuids).toEqual(['a', 'd']);
  });
});

describe('createLineItemPaymentPayload', () => {
  const method = {
    uuid: 'mode-1',
    name: 'Cash',
    description: 'Cash',
    retired: false,
    retireReason: null,
    auditInfo: {} as any,
    attributeTypes: [
      {
        uuid: 'attr-1',
        name: 'Reference Number',
        description: 'Reference Number',
        retired: false,
        required: true,
      },
    ],
    sortOrder: null,
    resourceVersion: '1.8',
  };

  it('builds payment body with tender amount and lineItemsToMarkPaid', () => {
    const payload = createLineItemPaymentPayload({
      method: method as any,
      amount: 150.5,
      referenceCode: 'REF-9',
      lineItemUuids: ['line-1', 'line-2'],
    });

    expect(payload).toEqual({
      instanceType: 'mode-1',
      amount: 150.5,
      amountTendered: 150.5,
      attributes: [{ attributeType: 'attr-1', value: 'REF-9' }],
      lineItemsToMarkPaid: ['line-1', 'line-2'],
    });
  });

  it('omits attributes when referenceCode is empty', () => {
    const payload = createLineItemPaymentPayload({
      method: method as any,
      amount: 10,
      lineItemUuids: ['line-1'],
    });
    expect(payload.attributes).toEqual([]);
  });
});
