import { getTemplateOrderBasketItem } from '../add-drug-order/drug-search/drug-search.resource';
import { prepMedicationOrderPostData } from '../api/api';
import { mockDrugSearchResultApiData } from '__mocks__';
import { mockPatient } from 'tools';
import {
  basketCoversServerOrderUuid,
  buildReturnedPrescriptionOrderPayloads,
  getBasketItemServerOrderUuid,
  getRemovedResendOrders,
  toDiscontinueBasketItem,
} from './returned-prescription-basket.utils';

const amoxServerUuid = 'amox-order-uuid';
const paracetamolServerUuid = 'para-order-uuid';

function createReviseOrder(drugIndex: number, serverUuid: string) {
  return {
    ...getTemplateOrderBasketItem(mockDrugSearchResultApiData[drugIndex], null),
    uuid: serverUuid,
    action: 'REVISE' as const,
    previousOrder: serverUuid,
  };
}

function createNewOrder(drugIndex: number) {
  return {
    ...getTemplateOrderBasketItem(mockDrugSearchResultApiData[drugIndex], null),
    action: 'NEW' as const,
    previousOrder: null,
  };
}

describe('returned-prescription-basket.utils', () => {
  test('getBasketItemServerOrderUuid returns previousOrder for revise orders', () => {
    const order = createReviseOrder(0, amoxServerUuid);
    expect(getBasketItemServerOrderUuid(order)).toBe(amoxServerUuid);
  });

  test('getBasketItemServerOrderUuid returns null for unsaved NEW orders', () => {
    const order = createNewOrder(1);
    expect(getBasketItemServerOrderUuid(order)).toBeNull();
  });

  test('basketCoversServerOrderUuid detects retained revise orders', () => {
    const amoxOrder = createReviseOrder(0, amoxServerUuid);
    expect(basketCoversServerOrderUuid([amoxOrder], amoxServerUuid)).toBe(true);
    expect(basketCoversServerOrderUuid([], amoxServerUuid)).toBe(false);
  });

  test('getRemovedResendOrders finds orders removed before submit', () => {
    const amoxOrder = createReviseOrder(0, amoxServerUuid);
    const paraOrder = createReviseOrder(1, paracetamolServerUuid);
    const replacementOrder = createNewOrder(1);

    const initialOrders = [amoxOrder, paraOrder];
    const finalOrders = [replacementOrder];

    expect(getRemovedResendOrders(initialOrders, finalOrders)).toEqual([amoxOrder, paraOrder]);
  });

  test('getRemovedResendOrders ignores unsaved NEW orders removed from basket', () => {
    const amoxOrder = createReviseOrder(0, amoxServerUuid);
    const newOrder = createNewOrder(1);

    expect(getRemovedResendOrders([amoxOrder, newOrder], [amoxOrder])).toEqual([]);
  });

  test('toDiscontinueBasketItem converts revise order to discontinue action', () => {
    const amoxOrder = createReviseOrder(0, amoxServerUuid);
    expect(toDiscontinueBasketItem(amoxOrder)).toEqual(
      expect.objectContaining({
        action: 'DISCONTINUE',
        previousOrder: amoxServerUuid,
      }),
    );
  });

  test('buildReturnedPrescriptionOrderPayloads appends discontinue payloads for removed orders', () => {
    const amoxOrder = createReviseOrder(0, amoxServerUuid);
    const replacementOrder = createNewOrder(1);
    const encounterUuid = 'enc-1';
    const ordererUuid = 'provider-1';

    const payloads = buildReturnedPrescriptionOrderPayloads(
      [amoxOrder],
      [replacementOrder],
      prepMedicationOrderPostData,
      mockPatient.id,
      encounterUuid,
      ordererUuid,
    );

    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'NEW', type: 'drugorder' }),
        expect.objectContaining({
          action: 'DISCONTINUE',
          type: 'drugorder',
          previousOrder: amoxServerUuid,
        }),
      ]),
    );
    expect(payloads).toHaveLength(2);
  });
});
