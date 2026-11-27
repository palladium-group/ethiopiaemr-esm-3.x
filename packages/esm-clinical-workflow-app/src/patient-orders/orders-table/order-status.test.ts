import { type Order } from '@openmrs/esm-patient-common-lib';
import { getOrderStatus, withoutReplacedOrders } from './order-status';

const order = (overrides: Partial<Order> = {}) => ({ uuid: 'order', action: 'NEW', ...overrides } as Order);

describe('getOrderStatus', () => {
  it('shows an order with no lab status as active with all actions', () => {
    expect(getOrderStatus(order())).toMatchObject({
      key: 'active',
      filter: 'active',
      actions: ['modify', 'results', 'cancel'],
    });
  });

  it('only allows editing results on a test completed through the results form', () => {
    const completed = order({ fulfillerStatus: 'COMPLETED', dateStopped: '2026-10-30T07:27:38.000+0000' });

    expect(getOrderStatus(completed)).toMatchObject({ key: 'completed', filter: 'completed', actions: ['results'] });
  });

  it('keeps the open order actions on a test completed by the lab system', () => {
    expect(getOrderStatus(order({ fulfillerStatus: 'COMPLETED', dateStopped: null }))).toMatchObject({
      key: 'completed',
      actions: ['modify', 'results', 'cancel'],
    });
  });

  it('shows a stopped order without results as cancelled with no actions', () => {
    const cancelled = order({ fulfillerStatus: 'IN_PROGRESS', dateStopped: '2026-10-30T07:27:38.000+0000' });

    expect(getOrderStatus(cancelled)).toMatchObject({ key: 'cancelled', filter: 'cancelled', actions: [] });
  });

  it('shows an order past its expiry date as expired with no actions', () => {
    const expired = order({ autoExpireDate: '2026-10-01T00:00:00.000+0000' });

    expect(getOrderStatus(expired, new Date('2026-10-30'))).toMatchObject({
      key: 'expired',
      filter: 'cancelled',
      actions: [],
    });
  });

  it('groups lab exceptions and declined orders as needing attention', () => {
    expect(getOrderStatus(order({ fulfillerStatus: 'EXCEPTION' }))).toMatchObject({
      key: 'exception',
      filter: 'attention',
      actions: ['modify', 'results', 'cancel'],
    });
    expect(getOrderStatus(order({ fulfillerStatus: 'DECLINED' }))).toMatchObject({
      key: 'declined',
      filter: 'attention',
      actions: [],
    });
  });
});

describe('withoutReplacedOrders', () => {
  it('drops an order replaced by a revision and keeps the revision', () => {
    const original = order({ uuid: 'original', dateStopped: '2026-10-30T07:27:38.000+0000' });
    const revision = order({ uuid: 'revision', action: 'REVISE', previousOrder: { uuid: 'original' } as any });

    expect(withoutReplacedOrders([original, revision])).toEqual([revision]);
  });
});
