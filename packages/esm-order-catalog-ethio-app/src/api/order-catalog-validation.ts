import {
  createDefaultOrderDetail,
  type CatalogSelectedOrderLine,
  type OrderCatalogOrderType,
  type OrderDetail,
} from '../types/order-catalog.types';

export interface OrderDetailValidationError {
  field: keyof OrderDetail | 'orderReasonNonCoded';
  message: string;
}

export interface OrderDetailValidationResult {
  valid: boolean;
  errors: Array<OrderDetailValidationError>;
}

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Mirrors required fields from the distro order forms
 * (`@kenyaemr/esm-imaging-orders-app`, `@kenyaemr/esm-procedure-orders-app`, lab test order form).
 */
export function validateOrderDetail(
  orderType: OrderCatalogOrderType,
  detail: OrderDetail,
): OrderDetailValidationResult {
  const errors: Array<OrderDetailValidationError> = [];

  if (!detail.urgency) {
    errors.push({ field: 'urgency', message: 'Priority is required' });
  }

  if (detail.urgency === 'ON_SCHEDULED_DATE' && !trimToUndefined(detail.scheduledDate)) {
    errors.push({ field: 'scheduledDate', message: 'Scheduled date is required' });
  }

  if (orderType === 'radiology' || orderType === 'procedure') {
    if (!trimToUndefined(detail.orderReasonNonCoded)) {
      errors.push({ field: 'orderReasonNonCoded', message: 'Order reason is required' });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateCatalogSelections(
  lines: Array<CatalogSelectedOrderLine>,
  orderDetails: Record<string, OrderDetail>,
): {
  valid: boolean;
  errorsByUuid: Record<string, Array<OrderDetailValidationError>>;
  firstInvalidUuid?: string;
} {
  const errorsByUuid: Record<string, Array<OrderDetailValidationError>> = {};

  for (const line of lines) {
    const detail = orderDetails[line.uuid] ?? createDefaultOrderDetail();
    const result = validateOrderDetail(line.orderType, detail);
    if (!result.valid) {
      errorsByUuid[line.uuid] = result.errors;
    }
  }

  const firstInvalidUuid = Object.keys(errorsByUuid)[0];

  return {
    valid: Object.keys(errorsByUuid).length === 0,
    errorsByUuid,
    firstInvalidUuid,
  };
}
