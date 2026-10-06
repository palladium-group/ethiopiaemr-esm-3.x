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

describe('recordConsultationPaymentIfApplicable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBillableServices = [
    {
      uuid: 'service-consultation-uuid',
      name: 'General Consultation',
      shortName: 'Consult',
      serviceStatus: 'ENABLED',
      serviceType: { display: 'Clinical Consultation' },
      servicePrices: [],
    },
    {
      uuid: 'service-lab-uuid',
      name: 'CBC',
      shortName: 'CBC',
      serviceStatus: 'ENABLED',
      serviceType: { display: 'Laboratory' },
      servicePrices: [],
    },
  ];

  it('saves consultation date when a clinical consultation line item is paid', async () => {
    const { openmrsFetch } = require('@openmrs/esm-framework');
    (openmrsFetch as jest.Mock).mockResolvedValueOnce({ data: { results: [] } }); // get attributes
    (openmrsFetch as jest.Mock).mockResolvedValueOnce({ ok: true }); // post attribute

    const paidLineItems = [
      {
        uuid: 'line-1',
        billableService: 'service-consultation-uuid:default',
        price: 50,
        quantity: 1,
      } as any,
    ];

    const { recordConsultationPaymentIfApplicable } = require('./utils');
    await recordConsultationPaymentIfApplicable(
      'patient-123',
      paidLineItems,
      mockBillableServices as any,
      'attr-type-consult-uuid',
    );

    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('/person/patient-123/attribute?v=custom:(uuid,value,attributeType:(uuid))'),
    );
    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('/person/patient-123/attribute'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"attributeType":"attr-type-consult-uuid"'),
      }),
    );
  });

  it('does not save consultation date when no consultation service is in paid line items', async () => {
    const { openmrsFetch } = require('@openmrs/esm-framework');

    const paidLineItems = [
      {
        uuid: 'line-2',
        billableService: 'service-lab-uuid:default',
        price: 100,
        quantity: 1,
      } as any,
    ];

    const { recordConsultationPaymentIfApplicable } = require('./utils');
    await recordConsultationPaymentIfApplicable(
      'patient-123',
      paidLineItems,
      mockBillableServices as any,
      'attr-type-consult-uuid',
    );

    expect(openmrsFetch).not.toHaveBeenCalled();
  });
});
