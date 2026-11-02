import {
  type DrugOrderBasketItem,
  type Order,
  type OrderAction,
  type OrderBasketItem,
  type TestOrderBasketItem,
} from '@openmrs/esm-patient-common-lib';

export const ORDER_TYPES = {
  DRUG_ORDER: 'drugorder',
  TEST_ORDER: 'testorder',
  GENERAL_ORDER: 'order',
} as const;

export const isOmrsOrder = (order: Order) => Object.values<string>(ORDER_TYPES).includes(order.type);

/** The order basket grouping an order belongs to, matching the groupings the basket panels use. */
export function getOrderGrouping(order: Order) {
  return order.type === ORDER_TYPES.DRUG_ORDER ? 'medications' : order.orderType?.uuid || 'general';
}

/** Basket items for an existing order have no uuid of their own; they point back at it through previousOrder. */
export const isOrderInBasket = (basketItems: Array<OrderBasketItem>, order: Order) =>
  basketItems.some((item) => item.previousOrder === order.uuid);

export function buildMedicationOrder(order: Order, action: OrderAction): DrugOrderBasketItem {
  const isFreeText = order.dosingType === 'org.openmrs.FreeTextDosingInstructions';
  const scheduledDate =
    order.urgency === 'ON_SCHEDULED_DATE' && order.scheduledDate ? new Date(order.scheduledDate) : null;
  const futureScheduledDate = scheduledDate && scheduledDate > new Date() ? scheduledDate : null;

  return {
    display: order.drug.display,
    previousOrder: order.uuid,
    action,
    drug: order.drug,
    dosage: order.dose ?? null,
    unit: order.doseUnits ? { value: order.doseUnits.display, valueCoded: order.doseUnits.uuid } : null,
    frequency: order.frequency
      ? { valueCoded: order.frequency.uuid, value: order.frequency.display, frequencyPerDay: null }
      : null,
    route: order.route ? { valueCoded: order.route.uuid, value: order.route.display } : null,
    commonMedicationName: order.drug.display,
    isFreeTextDosage: isFreeText,
    freeTextDosage: isFreeText ? order.dosingInstructions : '',
    patientInstructions: isFreeText ? '' : order.dosingInstructions,
    asNeeded: order.asNeeded,
    asNeededCondition: order.asNeededCondition ?? null,
    scheduledDate:
      action === 'REVISE' ? futureScheduledDate ?? new Date() : new Date(order.scheduledDate || order.dateActivated),
    duration: order.duration,
    durationUnit: order.durationUnits
      ? { valueCoded: order.durationUnits.uuid, value: order.durationUnits.display }
      : null,
    pillsDispensed: order.quantity,
    numRefills: order.numRefills,
    indication: order.orderReasonNonCoded,
    quantityUnits: order.quantityUnits
      ? { value: order.quantityUnits.display, valueCoded: order.quantityUnits.uuid }
      : null,
    encounterUuid: order.encounter?.uuid,
    previousOrderDateActivated: action === 'REVISE' ? order.dateActivated : undefined,
    visit: order.encounter.visit,
  };
}

export function buildGeneralOrder(order: Order, action: OrderAction): OrderBasketItem {
  return {
    action,
    display: order.display,
    previousOrder: order.uuid,
    instructions: order.instructions,
    urgency: order.urgency,
    accessionNumber: order.accessionNumber,
    concept: order.concept,
    orderNumber: order.orderNumber,
    orderType: order.orderType.uuid,
    scheduledDate: order.scheduledDate ? new Date(order.scheduledDate) : null,
    encounterUuid: order.encounter?.uuid,
    visit: order.encounter.visit,
  };
}

export function buildLabOrder(order: Order, action: OrderAction): TestOrderBasketItem {
  return {
    ...buildGeneralOrder(order, action),
    testType: { label: order.concept.display, conceptUuid: order.concept.uuid },
    specimenSource: null,
  } as TestOrderBasketItem;
}
