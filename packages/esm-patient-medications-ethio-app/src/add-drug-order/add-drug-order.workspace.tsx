import { type DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

export interface AddDrugOrderWorkspaceProps {
  /**
   * Optional. If provided, the form edits this order. Note that this order could either
   * be an already submitted order that the user wants to modify, or a NEW pending order in
   * the order basket. To distinguish the two, check order.action.
   */
  order?: DrugOrderBasketItem;

  /**
   * This field should only be supplied for an existing order saved to the backend
   */
  orderToEditOrdererUuid?: string;
}
