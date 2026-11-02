import dayjs from 'dayjs';
import { type Order } from '@openmrs/esm-patient-common-lib';

export type OrderStatusFilter = 'attention' | 'active' | 'completed' | 'cancelled';
export type OrderStatusKey =
  | 'active'
  | 'received'
  | 'inProgress'
  | 'onHold'
  | 'exception'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type OrderRowAction = 'modify' | 'results' | 'cancel';

export type OrderStatus = {
  key: OrderStatusKey;
  filter: OrderStatusFilter;
  tagType: 'gray' | 'blue' | 'cyan' | 'teal' | 'magenta' | 'green' | 'red';
  actions: Array<OrderRowAction>;
};

const openOrderActions: Array<OrderRowAction> = ['modify', 'results', 'cancel'];

/**
 * Works out the single status a patient order is shown with, and what can still be done to it.
 *
 * COMPLETED is checked first because the results form discontinues a test once its results are saved, so a
 * stopped order with results is finished rather than cancelled. Those orders are closed and only their results
 * can be edited. Orders completed by the lab system are never stopped, so they keep the actions of an open order.
 */
export function getOrderStatus(order: Order, now = new Date()): OrderStatus {
  if (order.fulfillerStatus === 'COMPLETED') {
    return {
      key: 'completed',
      filter: 'completed',
      tagType: 'green',
      actions: order.dateStopped ? ['results'] : openOrderActions,
    };
  }
  if (order.dateStopped) {
    return { key: 'cancelled', filter: 'cancelled', tagType: 'red', actions: [] };
  }
  if (order.autoExpireDate && dayjs(order.autoExpireDate).isBefore(now)) {
    return { key: 'expired', filter: 'cancelled', tagType: 'gray', actions: [] };
  }

  switch (order.fulfillerStatus) {
    case 'EXCEPTION':
      return { key: 'exception', filter: 'attention', tagType: 'magenta', actions: openOrderActions };
    case 'DECLINED':
      return { key: 'declined', filter: 'attention', tagType: 'red', actions: [] };
    case 'IN_PROGRESS':
      return { key: 'inProgress', filter: 'active', tagType: 'cyan', actions: openOrderActions };
    case 'ON_HOLD':
      return { key: 'onHold', filter: 'active', tagType: 'teal', actions: openOrderActions };
    case 'RECEIVED':
      return { key: 'received', filter: 'active', tagType: 'blue', actions: openOrderActions };
    default:
      return { key: 'active', filter: 'active', tagType: 'gray', actions: openOrderActions };
  }
}

/** Drops orders replaced by a revision or renewal: those are stopped too, but were never cancelled. */
export function withoutReplacedOrders(orders: Array<Order>): Array<Order> {
  const replacedUuids = new Set(
    orders
      .filter((order) => order.action === 'REVISE' || order.action === 'RENEW')
      .map((order) => (order.previousOrder as unknown as { uuid?: string })?.uuid),
  );
  return orders.filter((order) => !replacedUuids.has(order.uuid));
}
