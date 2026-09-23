import { renderHook } from '@testing-library/react';
import { usePopulateBillingFormFromVisit } from './usePopulateBillingFormFromVisit';

describe('usePopulateBillingFormFromVisit', () => {
  const billingTypes = [
    { uuid: 'pm-cbhi-uuid', name: 'CBHI' },
    { uuid: 'pm-cash-uuid', name: 'Cash' },
  ];

  const billingVisitAttributeTypes = {
    paymentMethod: 'pm-attr-uuid',
    creditType: 'ct-attr-uuid',
    creditTypeDetails: 'ctd-attr-uuid',
    paymentAttributesSummary: 'pas-attr-uuid',
    cbhi: {
      id: 'cbhi-id-uuid',
      fullName: 'cbhi-fullname-uuid',
      accountNo: 'cbhi-accountno-uuid',
      membershipType: 'cbhi-membershiptype-uuid',
      cbhiId: 'cbhi-cbhiid-uuid',
      insuredId: 'cbhi-insuredid-uuid',
    },
  };

  it('populates manual CBHI fields (cbhiId and expiryDate) from visit attributes', () => {
    const setValueMock = jest.fn();

    const activeVisit = {
      uuid: 'visit-1',
      attributes: [
        {
          uuid: 'attr-1',
          attributeType: { uuid: 'pm-attr-uuid' },
          value: 'pm-cbhi-uuid',
        },
        {
          uuid: 'attr-2',
          attributeType: { uuid: 'cbhi-cbhiid-uuid' },
          value: 'CBHI-8888',
        },
        {
          uuid: 'attr-3',
          attributeType: { uuid: 'pas-attr-uuid' },
          value: JSON.stringify({ expiryDate: '2027-01-01' }),
        },
      ],
    };

    renderHook(() =>
      usePopulateBillingFormFromVisit({
        activeVisit,
        billingTypes,
        billingVisitAttributeTypes,
        setValue: setValueMock,
      }),
    );

    // Payment method set
    expect(setValueMock).toHaveBeenCalledWith('billingTypeUuid', 'pm-cbhi-uuid', { shouldDirty: false });

    // Expiry date populated from summary (including alias)
    expect(setValueMock).toHaveBeenCalledWith('attributes.expiryDate', '2027-01-01', { shouldDirty: false });
    expect(setValueMock).toHaveBeenCalledWith('attributes.cbhiExpiryDate', '2027-01-01', { shouldDirty: false });

    // CBHI ID populated from independent visit attribute
    expect(setValueMock).toHaveBeenCalledWith('attributes.cbhiId', 'CBHI-8888', { shouldDirty: false });
  });
});
