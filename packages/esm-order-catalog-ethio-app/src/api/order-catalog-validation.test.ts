import { createDefaultOrderDetail, type CatalogSelectedOrderLine } from '../types/order-catalog.types';
import { validateCatalogSelections, validateOrderDetail } from './order-catalog-validation';

describe('order-catalog-validation', () => {
  it('requires scheduled date when urgency is ON_SCHEDULED_DATE', () => {
    const result = validateOrderDetail('lab', {
      ...createDefaultOrderDetail(),
      urgency: 'ON_SCHEDULED_DATE',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'scheduledDate')).toBe(true);
  });

  it('requires order reason for radiology and procedure', () => {
    expect(validateOrderDetail('radiology', createDefaultOrderDetail()).valid).toBe(false);
    expect(
      validateOrderDetail('procedure', {
        ...createDefaultOrderDetail(),
        orderReasonNonCoded: 'Clinical indication',
      }).valid,
    ).toBe(true);
  });

  it('validates all selected lines', () => {
    const lines: Array<CatalogSelectedOrderLine> = [
      {
        uuid: 'rad-1',
        displayName: 'Chest X-ray',
        isPanel: false,
        orderType: 'radiology',
      },
    ];

    const result = validateCatalogSelections(lines, {});
    expect(result.valid).toBe(false);
    expect(result.errorsByUuid['rad-1']?.some((e) => e.field === 'orderReasonNonCoded')).toBe(true);
  });
});
