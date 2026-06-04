import { partitionBasketOrders } from './order-catalog-basket-panel.utils';
import { type OrderBasketItem } from '@openmrs/esm-patient-common-lib';

function makeOrder(partial: Partial<OrderBasketItem>): OrderBasketItem {
  return {
    action: 'NEW',
    display: 'Test',
    uuid: partial.uuid ?? 'uuid-1',
    visit: {} as OrderBasketItem['visit'],
    ...partial,
  };
}

describe('partitionBasketOrders', () => {
  it('groups orders by action and incomplete flag', () => {
    const result = partitionBasketOrders([
      makeOrder({ uuid: '1', action: 'NEW' }),
      makeOrder({ uuid: '2', isOrderIncomplete: true }),
      makeOrder({ uuid: '3', action: 'DISCONTINUE' }),
    ]);

    expect(result.newOrderBasketItems).toHaveLength(1);
    expect(result.incompleteOrderBasketItems).toHaveLength(1);
    expect(result.discontinuedOrderBasketItems).toHaveLength(1);
  });
});
