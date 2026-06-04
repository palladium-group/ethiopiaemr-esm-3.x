import { type OrderBasketItem } from '@openmrs/esm-patient-common-lib';

export interface PartitionedBasketOrders<T extends OrderBasketItem> {
  incompleteOrderBasketItems: Array<T>;
  newOrderBasketItems: Array<T>;
  renewedOrderBasketItems: Array<T>;
  revisedOrderBasketItems: Array<T>;
  discontinuedOrderBasketItems: Array<T>;
}

export function partitionBasketOrders<T extends OrderBasketItem>(orders: Array<T>): PartitionedBasketOrders<T> {
  const incompleteOrderBasketItems: Array<T> = [];
  const newOrderBasketItems: Array<T> = [];
  const renewedOrderBasketItems: Array<T> = [];
  const revisedOrderBasketItems: Array<T> = [];
  const discontinuedOrderBasketItems: Array<T> = [];

  orders.forEach((order) => {
    if (order?.isOrderIncomplete) {
      incompleteOrderBasketItems.push(order);
    } else if (order.action === 'NEW') {
      newOrderBasketItems.push(order);
    } else if (order.action === 'RENEW') {
      renewedOrderBasketItems.push(order);
    } else if (order.action === 'REVISE') {
      revisedOrderBasketItems.push(order);
    } else if (order.action === 'DISCONTINUE') {
      discontinuedOrderBasketItems.push(order);
    }
  });

  return {
    incompleteOrderBasketItems,
    newOrderBasketItems,
    renewedOrderBasketItems,
    revisedOrderBasketItems,
    discontinuedOrderBasketItems,
  };
}

export function getCatalogBasketItemLabel(order: OrderBasketItem): string {
  const withTestType = order as OrderBasketItem & { testType?: { label?: string } };
  return withTestType.testType?.label ?? order.display;
}
