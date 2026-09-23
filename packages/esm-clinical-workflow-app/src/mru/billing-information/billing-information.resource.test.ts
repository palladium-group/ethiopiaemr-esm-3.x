import {
  createBillingInformationVisitAttribute,
  CBHI_VISIT_ATTRIBUTE_FIELDS,
  type BillingVisitAttributeTypesMap,
  type BillingFormData,
} from './billing-information.resource';

describe('createBillingInformationVisitAttribute', () => {
  const visitAttributeTypesMap: BillingVisitAttributeTypesMap = {
    paymentMethod: 'pm-uuid-1',
    creditType: 'ct-uuid-2',
    creditTypeDetails: 'ctd-uuid-3',
    paymentAttributesSummary: 'pas-uuid-4',
    cbhi: {
      id: 'cbhi-attr-id',
      fullName: 'cbhi-attr-fullname',
      accountNo: 'cbhi-attr-accountno',
      membershipType: 'cbhi-attr-membershiptype',
      cbhiId: 'cbhi-attr-cbhiid',
      insuredId: 'cbhi-attr-insuredid',
    },
  };

  it('persists only cbhiId and expiryDate when manual entry values are provided', () => {
    const formData: BillingFormData = {
      billingTypeUuid: 'payment-mode-cbhi-uuid',
      attributes: {
        cbhiId: 'CBHI-12345',
        expiryDate: '2026-12-31',
      },
    };

    const payload = createBillingInformationVisitAttribute(formData, visitAttributeTypesMap);

    // 1. paymentMethod
    expect(payload).toContainEqual({
      attributeType: 'pm-uuid-1',
      value: 'payment-mode-cbhi-uuid',
    });

    // 2. cbhiId attribute
    expect(payload).toContainEqual({
      attributeType: 'cbhi-attr-cbhiid',
      value: 'CBHI-12345',
    });

    // 3. paymentAttributesSummary contains expiryDate
    const summaryPayload = payload.find((item) => item.attributeType === 'pas-uuid-4');
    expect(summaryPayload).toBeDefined();
    const parsedSummary = JSON.parse(summaryPayload!.value);
    expect(parsedSummary).toEqual({
      expiryDate: '2026-12-31',
    });

    // Should NOT contain other unselected CBHI attributes
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-fullname')).toBeUndefined();
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-accountno')).toBeUndefined();
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-membershiptype')).toBeUndefined();
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-insuredid')).toBeUndefined();
  });

  it('persists full CBHI member attributes when online search values are provided', () => {
    const formData: BillingFormData = {
      billingTypeUuid: 'payment-mode-cbhi-uuid',
      attributes: {
        id: 'member-id-1',
        fullName: 'Abebe Bikila',
        accountNo: 'ACC-001',
        membershipType: 'MAIN',
        cbhiId: 'CBHI-999',
        insuredId: 'member-id-1',
      },
    };

    const payload = createBillingInformationVisitAttribute(formData, visitAttributeTypesMap);

    expect(payload).toContainEqual({ attributeType: 'pm-uuid-1', value: 'payment-mode-cbhi-uuid' });
    expect(payload).toContainEqual({ attributeType: 'cbhi-attr-id', value: 'member-id-1' });
    expect(payload).toContainEqual({ attributeType: 'cbhi-attr-fullname', value: 'Abebe Bikila' });
    expect(payload).toContainEqual({ attributeType: 'cbhi-attr-accountno', value: 'ACC-001' });
    expect(payload).toContainEqual({ attributeType: 'cbhi-attr-membershiptype', value: 'MAIN' });
    expect(payload).toContainEqual({ attributeType: 'cbhi-attr-cbhiid', value: 'CBHI-999' });
    expect(payload).toContainEqual({ attributeType: 'cbhi-attr-insuredid', value: 'member-id-1' });

    // Since all CBHI attributes are independent, summary payload should not be created
    expect(payload.find((item) => item.attributeType === 'pas-uuid-4')).toBeUndefined();
  });
});
