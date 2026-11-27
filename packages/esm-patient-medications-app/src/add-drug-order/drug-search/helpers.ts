import { launchWorkspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

type DrugsOrOrders = Pick<DrugOrderBasketItem, 'action' | 'commonMedicationName'>;

export function ordersEqual(order1: DrugsOrOrders, order2: DrugsOrOrders) {
  return order1.action === order2.action && order1.commonMedicationName === order2.commonMedicationName;
}

/**
 * Closes the drug search and shows the order basket, so the prescriber sees the incomplete
 * orders just added. Closing alone only returns to the basket when the search was opened
 * from it; opened from the chart, the panel would just disappear.
 */
export async function closeAndShowOrderBasket(closeWorkspace: Workspace2DefinitionProps['closeWorkspace']) {
  const closed = await closeWorkspace();
  if (closed) {
    await launchWorkspace2('order-basket');
  }
}
