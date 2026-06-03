import type { DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

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
