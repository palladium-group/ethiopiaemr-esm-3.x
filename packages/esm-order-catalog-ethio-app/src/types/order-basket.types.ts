import {
  type OrderBasketItem,
  type OrderPost,
  type OrderUrgency,
  type TestOrderBasketItem,
} from '@openmrs/esm-patient-common-lib';

export type { TestOrderBasketItem };

/** Matches `@kenyaemr/esm-imaging-orders-app` basket item shape. */
export interface ImagingOrderBasketItem extends OrderBasketItem {
  testType: {
    label: string;
    conceptUuid: string;
  };
  orderReason?: string;
  orderReasonNonCoded?: string;
  scheduleDate?: Date | string;
  commentsToFulfiller?: string;
  laterality?: string;
  bodySite?: string;
  orderer?: string;
  careSetting?: string;
}

/** Matches `@kenyaemr/esm-procedure-orders-app` basket item shape. */
export interface ProcedureOrderBasketItem extends OrderBasketItem {
  testType: {
    label: string;
    conceptUuid: string;
  };
  orderReason?: string;
  orderReasonNonCoded?: string;
  scheduleDate?: Date | string;
  commentsToFulfiller?: string;
  laterality?: string;
  bodySite?: string;
  numberOfRepeats?: string;
  frequency?: string;
  category?: string;
  orderer?: string;
  careSetting?: string;
}

export interface ImagingOrderPost extends OrderPost {
  scheduledDate?: string;
  commentToFulfiller?: string;
  laterality?: string;
  bodySite?: string;
}

export interface ProcedureOrderPost extends OrderPost {
  scheduledDate?: string;
  commentToFulfiller?: string;
  numberOfRepeats?: string;
  bodySite?: string;
  category?: string;
  frequency?: string;
}

export { type OrderUrgency };
