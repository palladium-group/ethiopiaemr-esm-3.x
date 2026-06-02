import { toOmrsIsoString } from '@openmrs/esm-framework';
import {
  type OrderBasketItem,
  type PostDataPrepFunction,
  type TestOrderBasketItem,
  type TestOrderPost,
} from '@openmrs/esm-patient-common-lib';
import { collectSelectedItems } from './order-catalog.utils';
import { validateOrderDetail } from './order-catalog-validation';
import {
  createDefaultOrderDetail,
  type CatalogSelectedOrderLine,
  type CatalogTab,
  type OrderCatalogOrderType,
  type OrderDetail,
} from '../types/order-catalog.types';
import {
  type ImagingOrderBasketItem,
  type ImagingOrderPost,
  type ProcedureOrderBasketItem,
  type ProcedureOrderPost,
} from '../types/order-basket.types';

export const defaultCareSettingUuid = '6f0c9a92-6f24-11e3-af88-005056821db0';

export const defaultLabOrderTypeUuid = '52a447d3-a64a-11e3-9aeb-50e549534c5e';

/** Default order encounter type from Ethiopia EMR distro (`esm-patient-orders-app`). */
export const defaultOrderEncounterTypeUuid = '7df67b83-1b84-4fe2-b1b7-794b4e9bfcc3';

export const imagingBasketGrouping = 'imaging';

export const proceduresBasketGrouping = 'procedures';

export type { CatalogSelectedOrderLine };

export function collectSelectedOrdersAcrossTabs(
  tabs: Array<CatalogTab>,
  selectedUuids: Set<string>,
): Array<CatalogSelectedOrderLine> {
  const seen = new Set<string>();
  const lines: Array<CatalogSelectedOrderLine> = [];

  for (const tab of tabs) {
    for (const item of collectSelectedItems(tab, selectedUuids)) {
      if (seen.has(item.uuid)) {
        continue;
      }
      seen.add(item.uuid);
      lines.push({ ...item, orderType: tab.orderType });
    }
  }

  return lines;
}

function scheduledDateFromDetail(detail: OrderDetail): Date | undefined {
  if (detail.urgency !== 'ON_SCHEDULED_DATE' || !detail.scheduledDate) {
    return undefined;
  }
  return new Date(detail.scheduledDate);
}

function scheduleValueFromDetail(detail: OrderDetail): Date | string | undefined {
  const date = scheduledDateFromDetail(detail);
  return date ?? undefined;
}

function isOrderDetailComplete(orderType: OrderCatalogOrderType, detail: OrderDetail): boolean {
  return validateOrderDetail(orderType, detail).valid;
}

export function buildTestOrderBasketItem(
  line: CatalogSelectedOrderLine,
  detail: OrderDetail,
  visit: OrderBasketItem['visit'],
): TestOrderBasketItem {
  const complete = isOrderDetailComplete('lab', detail);
  return {
    action: 'NEW',
    display: line.displayName,
    testType: {
      label: line.displayName,
      conceptUuid: line.uuid,
    },
    visit,
    urgency: detail.urgency,
    instructions: detail.instructions,
    scheduledDate: scheduledDateFromDetail(detail),
    isOrderIncomplete: !complete,
  };
}

export function buildImagingOrderBasketItem(
  line: CatalogSelectedOrderLine,
  detail: OrderDetail,
  visit: OrderBasketItem['visit'],
  ordererUuid: string,
): ImagingOrderBasketItem {
  const complete = isOrderDetailComplete('radiology', detail);
  return {
    action: 'NEW',
    display: line.displayName,
    testType: {
      label: line.displayName,
      conceptUuid: line.uuid,
    },
    visit,
    orderer: ordererUuid,
    urgency: detail.urgency,
    instructions: detail.instructions,
    orderReasonNonCoded: detail.orderReasonNonCoded,
    commentsToFulfiller: detail.commentsToFulfiller,
    laterality: detail.laterality,
    scheduleDate: scheduleValueFromDetail(detail),
    isOrderIncomplete: !complete,
  };
}

export function buildProcedureOrderBasketItem(
  line: CatalogSelectedOrderLine,
  detail: OrderDetail,
  visit: OrderBasketItem['visit'],
  ordererUuid: string,
): ProcedureOrderBasketItem {
  const complete = isOrderDetailComplete('procedure', detail);
  return {
    action: 'NEW',
    display: line.displayName,
    testType: {
      label: line.displayName,
      conceptUuid: line.uuid,
    },
    visit,
    orderer: ordererUuid,
    urgency: detail.urgency,
    instructions: detail.instructions,
    orderReasonNonCoded: detail.orderReasonNonCoded,
    commentsToFulfiller: detail.commentsToFulfiller,
    bodySite: detail.bodySite,
    numberOfRepeats: detail.numberOfRepeats,
    scheduleDate: scheduleValueFromDetail(detail),
    isOrderIncomplete: !complete,
  };
}

function mergeByConceptUuid<T extends { testType: { conceptUuid: string } }>(
  existing: Array<T>,
  incoming: Array<T>,
): Array<T> {
  const next = [...existing];
  for (const item of incoming) {
    const idx = next.findIndex((order) => order.testType.conceptUuid === item.testType.conceptUuid);
    if (idx >= 0) {
      next[idx] = item;
    } else {
      next.push(item);
    }
  }
  return next;
}

export interface CatalogBasketPayload {
  lab: Array<TestOrderBasketItem>;
  imaging: Array<ImagingOrderBasketItem>;
  procedures: Array<ProcedureOrderBasketItem>;
}

export function buildCatalogBasketPayload(
  tabs: Array<CatalogTab>,
  selectedUuids: Set<string>,
  orderDetails: Record<string, OrderDetail>,
  visit: OrderBasketItem['visit'],
  ordererUuid: string,
): CatalogBasketPayload {
  const lines = collectSelectedOrdersAcrossTabs(tabs, selectedUuids);
  const payload: CatalogBasketPayload = { lab: [], imaging: [], procedures: [] };

  for (const line of lines) {
    const detail = orderDetails[line.uuid] ?? createDefaultOrderDetail();

    switch (line.orderType) {
      case 'lab':
        payload.lab.push(buildTestOrderBasketItem(line, detail, visit));
        break;
      case 'radiology':
        payload.imaging.push(buildImagingOrderBasketItem(line, detail, visit, ordererUuid));
        break;
      case 'procedure':
        payload.procedures.push(buildProcedureOrderBasketItem(line, detail, visit, ordererUuid));
        break;
      default:
        break;
    }
  }

  return payload;
}

export const prepTestOrderPostData: PostDataPrepFunction = (
  order: TestOrderBasketItem,
  patientUuid,
  encounterUuid,
  orderingProviderUuid,
): TestOrderPost => {
  const scheduledDate = order.scheduledDate ? toOmrsIsoString(order.scheduledDate) : null;

  if (order.action === 'NEW' || order.action === 'RENEW') {
    return {
      action: 'NEW',
      type: 'testorder',
      patient: patientUuid,
      careSetting: defaultCareSettingUuid,
      orderer: orderingProviderUuid,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      instructions: order.instructions,
      orderReason: order.orderReason,
      accessionNumber: order.accessionNumber,
      urgency: order.urgency,
      scheduledDate,
    };
  }

  if (order.action === 'REVISE') {
    return {
      action: 'REVISE',
      type: 'testorder',
      patient: patientUuid,
      careSetting: defaultCareSettingUuid,
      orderer: orderingProviderUuid,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      instructions: order.instructions,
      orderReason: order.orderReason,
      previousOrder: order.previousOrder,
      accessionNumber: order.accessionNumber,
      urgency: order.urgency,
      scheduledDate,
    };
  }

  if (order.action === 'DISCONTINUE') {
    return {
      action: 'DISCONTINUE',
      type: 'testorder',
      patient: patientUuid,
      careSetting: defaultCareSettingUuid,
      orderer: orderingProviderUuid,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      orderReason: order.orderReason,
      previousOrder: order.previousOrder,
      accessionNumber: order.accessionNumber,
      urgency: order.urgency,
      scheduledDate,
    };
  }

  throw new Error(`Unknown order action: ${order.action}.`);
};

function resolveImagingScheduledDate(order: ImagingOrderBasketItem): string | undefined {
  if (order.urgency !== 'ON_SCHEDULED_DATE') {
    return undefined;
  }
  if (order.scheduleDate instanceof Date) {
    return order.scheduleDate.toISOString();
  }
  return order.scheduleDate;
}

export const prepImagingOrderPostData: PostDataPrepFunction = (
  order: ImagingOrderBasketItem,
  patientUuid,
  encounterUuid,
  _orderingProviderUuid,
): ImagingOrderPost => {
  const basePayload = {
    type: 'procedureorder' as const,
    patient: patientUuid,
    careSetting: order.careSetting ?? defaultCareSettingUuid,
    orderer: order.orderer ?? _orderingProviderUuid,
    encounter: encounterUuid ?? undefined,
    concept: order.testType?.conceptUuid,
    orderReason: order.orderReason,
    orderReasonNonCoded: order.orderReasonNonCoded,
    commentToFulfiller: order.commentsToFulfiller,
    laterality: order.laterality,
    bodySite: order.bodySite,
    scheduledDate: resolveImagingScheduledDate(order),
  };

  if (order.action === 'NEW' || order.action === 'RENEW') {
    return {
      ...basePayload,
      action: 'NEW',
      careSetting: defaultCareSettingUuid,
      instructions: order.instructions,
      urgency: order.urgency,
    };
  }

  if (order.action === 'REVISE') {
    return { ...basePayload, action: 'REVISE', instructions: order.instructions };
  }

  if (order.action === 'DISCONTINUE') {
    return { ...basePayload, action: 'DISCONTINUE' };
  }

  throw new Error(`Unknown order action: ${order.action}.`);
};

function resolveProcedureScheduledDate(order: ProcedureOrderBasketItem): string | undefined {
  if (order.urgency !== 'ON_SCHEDULED_DATE') {
    return undefined;
  }
  if (order.scheduleDate instanceof Date) {
    return order.scheduleDate.toISOString();
  }
  return order.scheduleDate;
}

export const prepProceduresOrderPostData: PostDataPrepFunction = (
  order: ProcedureOrderBasketItem,
  patientUuid,
  encounterUuid,
  orderingProviderUuid,
): ProcedureOrderPost => {
  const scheduledDate = resolveProcedureScheduledDate(order);

  if (order.action === 'NEW' || order.action === 'RENEW') {
    return {
      action: 'NEW',
      type: 'procedureorder',
      patient: patientUuid,
      careSetting: defaultCareSettingUuid,
      orderer: order.orderer ?? orderingProviderUuid,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      frequency: order.frequency,
      numberOfRepeats: order.numberOfRepeats,
      urgency: order.urgency,
      commentToFulfiller: order.commentsToFulfiller,
      instructions: order.instructions,
      orderReason: order.orderReason,
      orderReasonNonCoded: order.orderReasonNonCoded,
      bodySite: order.bodySite,
      category: order.category,
      scheduledDate,
    };
  }

  if (order.action === 'REVISE') {
    return {
      action: 'REVISE',
      type: 'procedureorder',
      patient: patientUuid,
      careSetting: order.careSetting ?? defaultCareSettingUuid,
      orderer: order.orderer ?? orderingProviderUuid,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      frequency: order.frequency,
      numberOfRepeats: order.numberOfRepeats,
      urgency: order.urgency,
      commentToFulfiller: order.commentsToFulfiller,
      instructions: order.instructions,
      orderReason: order.orderReason,
      orderReasonNonCoded: order.orderReasonNonCoded,
      bodySite: order.bodySite,
      category: order.category,
      scheduledDate,
    };
  }

  if (order.action === 'DISCONTINUE') {
    return {
      action: 'DISCONTINUE',
      type: 'procedureorder',
      patient: patientUuid,
      careSetting: order.careSetting ?? defaultCareSettingUuid,
      orderer: order.orderer ?? orderingProviderUuid,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      frequency: order.frequency,
      numberOfRepeats: order.numberOfRepeats,
      urgency: order.urgency,
      commentToFulfiller: order.commentsToFulfiller,
      orderReason: order.orderReason,
      orderReasonNonCoded: order.orderReasonNonCoded,
      previousOrder: order.previousOrder,
      scheduledDate,
    };
  }

  throw new Error(`Unknown order action: ${order.action}.`);
};

export function mergeCatalogIntoBasket<T extends { testType: { conceptUuid: string } }>(
  existing: Array<T>,
  incoming: Array<T>,
): Array<T> {
  return mergeByConceptUuid(existing, incoming);
}
