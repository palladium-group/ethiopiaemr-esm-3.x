/** Lab, radiology, or procedure — inferred from the top-level tab concept. */
export type OrderCatalogOrderType = 'lab' | 'radiology' | 'procedure';

/** Mirrors the urgency options used by the standard OpenMRS order basket. */
export type OrderUrgency = 'ROUTINE' | 'STAT' | 'ON_SCHEDULED_DATE';

/** Imaging laterality, mirroring the KenyaEMR imaging order form. */
export type OrderLaterality = 'LEFT' | 'RIGHT' | 'BILATERAL';

/**
 * Per-order details captured in the Selected area before the order is placed.
 * The superset of fields used by the lab, radiology, and procedure order forms;
 * each form only renders the fields relevant to its order type.
 */
export interface OrderDetail {
  urgency: OrderUrgency;
  /** ISO date string; only relevant when urgency is ON_SCHEDULED_DATE. */
  scheduledDate?: string;
  instructions?: string;
  /** Radiology + procedure: free-text reason for the order. */
  orderReasonNonCoded?: string;
  /** Radiology + procedure: note routed to the fulfiller. */
  commentsToFulfiller?: string;
  /** Radiology only. */
  laterality?: OrderLaterality;
  /** Procedure only. */
  bodySite?: string;
  /** Procedure only. */
  numberOfRepeats?: string;
}

export function createDefaultOrderDetail(): OrderDetail {
  return { urgency: 'ROUTINE' };
}

export interface CatalogTest {
  uuid: string;
  displayName: string;
  conceptClassName: string;
  conceptClassDescription: string;
  isPanel: boolean;
  childTests: Array<CatalogTest>;
}

export interface CatalogCategory {
  uuid: string;
  displayName: string;
  tests: Array<CatalogTest>;
}

export interface CatalogTabStub {
  uuid: string;
  displayName: string;
  orderType: OrderCatalogOrderType;
}

export interface CatalogTab extends CatalogTabStub {
  categories: Array<CatalogCategory>;
}

/** Selected catalog row with the tab order type used for forms and basket routing. */
export interface CatalogSelectedOrderLine {
  uuid: string;
  displayName: string;
  isPanel: boolean;
  orderType: OrderCatalogOrderType;
}

/** Raw concept shape returned by the OpenMRS REST custom representation. */
export interface CatalogConceptResponse {
  uuid: string;
  display?: string;
  names?: Array<{
    name: string;
    conceptNameType: string;
    locale?: string;
  }>;
  name?: { display?: string; uuid?: string };
  conceptClass?: {
    uuid: string;
    name: string;
    description?: string;
  };
  setMembers?: Array<CatalogConceptResponse>;
}
