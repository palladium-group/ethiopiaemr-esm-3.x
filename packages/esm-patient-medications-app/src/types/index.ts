import type { DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

export type DtpResponse = 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED';

export type ReturnedPrescriptionBasketItem = DrugOrderBasketItem & {
  isReturnedPrescription?: boolean;
  dtpResponse?: DtpResponse;
  dtpResponseConceptUuid?: string;
};
