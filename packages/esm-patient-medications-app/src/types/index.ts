import type { DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

/**
 * `startDate` was dropped from `DrugOrderBasketItem` in @openmrs/esm-patient-common-lib 12.2.x,
 * where upstream moved to `scheduledDate` plus `urgency: ON_SCHEDULED_DATE`. This app only uses
 * the value to seed the order form's start-date picker — it is never sent to the backend by
 * `prepMedicationOrderPostData` — and common-lib's `getOrderStartDate` still reads `startDate`
 * at runtime. Drop this type if the app adopts upstream's scheduled-order model.
 */
export type DrugOrderBasketItemWithStartDate = DrugOrderBasketItem & {
  startDate?: Date | string;
};

export type DtpResponse = 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED';

export type ReturnedPrescriptionDtpState = {
  dtpResponse?: DtpResponse;
  dtpResponseConceptUuid?: string;
  dtpRemark?: string;
};

export type ReturnedPrescriptionBasketItem = DrugOrderBasketItem & {
  isReturnedPrescription?: boolean;
  dtpResponse?: DtpResponse;
  dtpResponseConceptUuid?: string;
  dtpRemark?: string;
};

export function isReturnedPrescriptionDtpIncomplete(dtp: ReturnedPrescriptionDtpState): boolean {
  const hasDtpResponse = Boolean(dtp.dtpResponseConceptUuid || dtp.dtpResponse);
  const hasRemark = Boolean(dtp.dtpRemark?.trim());
  return !hasDtpResponse || !hasRemark;
}

export function isReturnedPrescriptionBasketIncomplete(order: ReturnedPrescriptionBasketItem): boolean {
  return isReturnedPrescriptionDtpIncomplete(order);
}
