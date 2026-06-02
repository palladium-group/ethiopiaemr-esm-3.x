import type { DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

export type DtpResponse = 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED';

export type ReturnedPrescriptionBasketItem = DrugOrderBasketItem & {
  isReturnedPrescription?: boolean;
  dtpResponse?: DtpResponse;
  dtpResponseConceptUuid?: string;
  dtpRemark?: string;
};

export function isReturnedPrescriptionBasketIncomplete(order: ReturnedPrescriptionBasketItem): boolean {
  const hasDtpResponse = Boolean(order.dtpResponseConceptUuid || order.dtpResponse);
  const hasRemark = Boolean(order.dtpRemark?.trim());
  return !hasDtpResponse || !hasRemark;
}
