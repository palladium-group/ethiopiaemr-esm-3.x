import { type Order, type OrderBasketItem } from '@openmrs/esm-patient-common-lib';
import { buildGeneralOrder, isOrderInBasket } from './order-basket-items';

const order = {
  uuid: 'order',
  display: 'CBC',
  orderType: { uuid: 'test-order-type' },
  encounter: { uuid: 'encounter', visit: { uuid: 'visit' } },
} as Order;

describe('isOrderInBasket', () => {
  it('finds an order that was already added to the basket', () => {
    expect(isOrderInBasket([buildGeneralOrder(order, 'DISCONTINUE')], order)).toBe(true);
  });

  it('ignores basket items for other orders and new orders', () => {
    const otherOrder = buildGeneralOrder({ ...order, uuid: 'other' }, 'DISCONTINUE');
    const newOrder = { action: 'NEW', previousOrder: null } as OrderBasketItem;

    expect(isOrderInBasket([otherOrder, newOrder], order)).toBe(false);
  });
});
