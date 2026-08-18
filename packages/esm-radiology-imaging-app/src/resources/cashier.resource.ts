import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { RadiologyConfig } from '../config-schema';

export const ALLOWED_PAYMENT_STATUSES = ['PAID', 'EXEMPTED'] as const;

export type AllowedPaymentStatus = (typeof ALLOWED_PAYMENT_STATUSES)[number];

export interface BillLineItem {
  uuid: string;
  voided?: boolean;
  paymentStatus?: string;
  settlementStatus?: string;
  order?: { uuid: string };
}

export interface BillLineItemSearchResponse {
  results: Array<BillLineItem>;
}

export type OrderPaymentResolution = {
  isPaid: boolean;
  paymentStatus: string | null;
};

export type WorklistPaymentGate = {
  canCreateWorklist: boolean;
  isUnpaid: boolean;
  hasPaymentStatusError: boolean;
};

export function deriveWorklistPaymentGate({
  enforceBillPayment,
  isLoading,
  error,
  isPaid,
}: {
  enforceBillPayment: boolean;
  isLoading: boolean;
  error: unknown;
  isPaid: boolean;
}): WorklistPaymentGate {
  if (!enforceBillPayment) {
    return { canCreateWorklist: true, isUnpaid: false, hasPaymentStatusError: false };
  }

  const hasPaymentStatusError = Boolean(error);
  const isUnpaid = !isLoading && !hasPaymentStatusError && !isPaid;
  const canCreateWorklist = !isLoading && !hasPaymentStatusError && isPaid;

  return { canCreateWorklist, isUnpaid, hasPaymentStatusError };
}

export class UnpaidOrderError extends Error {
  constructor(message = 'Order has not been paid') {
    super(message);
    this.name = 'UnpaidOrderError';
  }
}

export function interpolateBillingStatusUrl(template: string, orderUuid: string): string {
  return template.replace(/\$\{restBaseUrl\}/g, restBaseUrl).replace(/\$\{orderUuid\}/g, encodeURIComponent(orderUuid));
}

export function resolveOrderPaymentStatus(lineItems: Array<BillLineItem> | undefined | null): OrderPaymentResolution {
  const activeItems = (lineItems ?? []).filter((item) => !item?.voided);

  if (activeItems.length === 0) {
    return { isPaid: false, paymentStatus: null };
  }

  const paidItem = activeItems.find((item) =>
    ALLOWED_PAYMENT_STATUSES.includes((item.paymentStatus ?? '').toUpperCase() as AllowedPaymentStatus),
  );

  if (paidItem) {
    return { isPaid: true, paymentStatus: paidItem.paymentStatus ?? null };
  }

  return { isPaid: false, paymentStatus: activeItems[0].paymentStatus ?? null };
}

export async function fetchOrderBillLineItems(
  orderUuid: string,
  billingStatusQueryUrl: string,
): Promise<Array<BillLineItem>> {
  const url = interpolateBillingStatusUrl(billingStatusQueryUrl, orderUuid);
  const response = await openmrsFetch<BillLineItemSearchResponse>(url);
  return response.data?.results ?? [];
}

export async function ensureOrderPaymentAllowsWorklist(
  orderUuid: string,
  config: Pick<RadiologyConfig, 'enforceBillPayment' | 'billingStatusQueryUrl'>,
): Promise<void> {
  if (!config.enforceBillPayment) {
    return;
  }

  const lineItems = await fetchOrderBillLineItems(orderUuid, config.billingStatusQueryUrl);
  const { isPaid } = resolveOrderPaymentStatus(lineItems);

  if (!isPaid) {
    throw new UnpaidOrderError();
  }
}
