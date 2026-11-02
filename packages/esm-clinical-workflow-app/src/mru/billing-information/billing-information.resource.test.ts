import {
  createBillingInformationVisitAttribute,
  type BillingVisitAttributeTypesMap,
  type BillingFormData,
} from './billing-information.resource';
import {
  INSURANCE_ATTRIBUTE_UUIDS,
  SHI_ATTRIBUTE_UUIDS,
  CREDIT_COMPANY_ATTRIBUTE_UUIDS,
  CBHI_ATTRIBUTE_UUIDS,
} from './billing-constants';

describe('createBillingInformationVisitAttribute', () => {
  const visitAttributeTypesMap: BillingVisitAttributeTypesMap = {
    paymentMethod: 'pm-uuid-1',
    cbhi: {
      id: 'cbhi-attr-id',
      fullName: 'cbhi-attr-fullname',
      accountNo: 'cbhi-attr-accountno',
      membershipType: 'cbhi-attr-membershiptype',
      cbhiId: 'cbhi-attr-cbhiid',
      insuredId: 'cbhi-attr-insuredid',
      cbhiExpiryDate: 'cbhi-attr-expirydate',
    },
    insurance: {
      insuranceId: 'ins-attr-id',
      insuranceExpiryDate: 'ins-attr-expiry',
    },
    shi: {
      shiId: 'shi-attr-id',
      shiExpiryDate: 'shi-attr-expiry',
    },
    creditCompany: 'credit-company-attr-uuid',
  };

  it('persists only cbhiId and expiryDate as separate attributes when manual entry values are provided', () => {
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

    // 3. expiryDate saved as separate attribute
    expect(payload).toContainEqual({
      attributeType: 'cbhi-attr-expirydate',
      value: '2026-12-31',
    });

    // Should NOT contain other unselected CBHI attributes
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-fullname')).toBeUndefined();
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-accountno')).toBeUndefined();
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-membershiptype')).toBeUndefined();
    expect(payload.find((item) => item.attributeType === 'cbhi-attr-insuredid')).toBeUndefined();
  });

  it('persists full CBHI member attributes as separate attributes when online search values are provided', () => {
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
  });

  it('persists insurance fields as separate visit attributes', () => {
    const formData: BillingFormData = {
      billingTypeUuid: 'payment-mode-insurance-uuid',
      attributes: {
        [INSURANCE_ATTRIBUTE_UUIDS.insuranceId]: 'INS-555',
        [INSURANCE_ATTRIBUTE_UUIDS.insuranceName]: 'Nyala Insurance',
        [INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate]: '2027-05-01',
      },
    };

    const payload = createBillingInformationVisitAttribute(formData, visitAttributeTypesMap);

    expect(payload).toContainEqual({ attributeType: 'pm-uuid-1', value: 'payment-mode-insurance-uuid' });
    expect(payload).toContainEqual({ attributeType: INSURANCE_ATTRIBUTE_UUIDS.insuranceId, value: 'INS-555' });
    expect(payload).toContainEqual({
      attributeType: INSURANCE_ATTRIBUTE_UUIDS.insuranceName,
      value: 'Nyala Insurance',
    });
    expect(payload).toContainEqual({
      attributeType: INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate,
      value: '2027-05-01',
    });
  });

  it('persists SHI and Credit Company as separate visit attributes', () => {
    const shiFormData: BillingFormData = {
      billingTypeUuid: 'payment-mode-shi-uuid',
      attributes: {
        [SHI_ATTRIBUTE_UUIDS.shiId]: 'SHI-888',
        [SHI_ATTRIBUTE_UUIDS.shiExpiryDate]: '2028-01-01',
      },
    };

    const shiPayload = createBillingInformationVisitAttribute(shiFormData, visitAttributeTypesMap);
    expect(shiPayload).toContainEqual({ attributeType: SHI_ATTRIBUTE_UUIDS.shiId, value: 'SHI-888' });
    expect(shiPayload).toContainEqual({ attributeType: SHI_ATTRIBUTE_UUIDS.shiExpiryDate, value: '2028-01-01' });

    const creditCompanyFormData: BillingFormData = {
      billingTypeUuid: 'payment-mode-credit-company-uuid',
      attributes: {
        [CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany]: 'company-uuid-123',
      },
    };

    const creditPayload = createBillingInformationVisitAttribute(creditCompanyFormData, visitAttributeTypesMap);
    expect(creditPayload).toContainEqual({
      attributeType: CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany,
      value: 'company-uuid-123',
    });
  });
});
