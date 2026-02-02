import { createPaymentPoint, type PaymentPointPayload, updatePaymentPoint } from './payment-points.resource';

export interface FormData {
  cashPointName: string;
  description?: string;
}

/**
 * Builds the API payload for a payment point.
 * Pure function — no side effects.
 */
export const buildPaymentPointPayload = (formData: FormData, locationUuid: string): PaymentPointPayload => ({
  name: formData.cashPointName,
  description: formData.description ?? '',
  retired: false,
  location: locationUuid,
});

/**
 * Creates or updates a payment point.
 * Single responsibility: persist data.
 */
export const savePaymentPoint = async ({
  formData,
  locationUuid,
  paymentPointUuid,
}: {
  formData: FormData;
  locationUuid: string;
  paymentPointUuid?: string;
}) => {
  const payload = buildPaymentPointPayload(formData, locationUuid);

  return paymentPointUuid ? updatePaymentPoint(paymentPointUuid, payload) : createPaymentPoint(payload);
};
