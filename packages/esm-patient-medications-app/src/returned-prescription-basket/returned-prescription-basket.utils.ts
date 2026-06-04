import { type DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

/**
 * Returns the OpenMRS order UUID that a basket item refers to on the server.
 * NEW orders that have not yet been saved return null.
 */
export function getBasketItemServerOrderUuid(order: DrugOrderBasketItem): string | null {
  if (order.previousOrder) {
    return order.previousOrder;
  }
  if (order.action !== 'NEW' && order.uuid) {
    return order.uuid;
  }
  return null;
}

export function basketCoversServerOrderUuid(orders: DrugOrderBasketItem[], serverOrderUuid: string): boolean {
  return orders.some((order) => getBasketItemServerOrderUuid(order) === serverOrderUuid);
}

/**
 * Finds initial resend orders that were removed from the basket before submit.
 * Each removed order should be discontinued on the server.
 */
export function getRemovedResendOrders(
  initialOrders: DrugOrderBasketItem[],
  finalOrders: DrugOrderBasketItem[],
): DrugOrderBasketItem[] {
  return initialOrders.filter((initialOrder) => {
    const serverOrderUuid = getBasketItemServerOrderUuid(initialOrder);
    if (!serverOrderUuid) {
      return false;
    }
    return !basketCoversServerOrderUuid(finalOrders, serverOrderUuid);
  });
}

export function toDiscontinueBasketItem(order: DrugOrderBasketItem): DrugOrderBasketItem {
  const previousOrder = getBasketItemServerOrderUuid(order);
  if (!previousOrder) {
    throw new Error('Cannot discontinue order without a server order UUID.');
  }

  return {
    ...order,
    action: 'DISCONTINUE',
    previousOrder,
  };
}

export function buildReturnedPrescriptionOrderPayloads(
  initialOrders: DrugOrderBasketItem[],
  finalOrders: DrugOrderBasketItem[],
  prepOrder: (order: DrugOrderBasketItem, patientUuid: string, encounterUuid: string, ordererUuid: string) => unknown,
  patientUuid: string,
  encounterUuid: string,
  ordererUuid: string,
): unknown[] {
  const removedOrders = getRemovedResendOrders(initialOrders, finalOrders);
  const discontinueOrders = removedOrders.map(toDiscontinueBasketItem);

  return [
    ...finalOrders.map((order) => prepOrder(order, patientUuid, encounterUuid, ordererUuid)),
    ...discontinueOrders.map((order) => prepOrder(order, patientUuid, encounterUuid, ordererUuid)),
  ];
}
