import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { RadiologyOrder } from '../radiology-imaging/types';

type OrderResourceResponse = {
  type?: string;
  clinicalHistory?: string | null;
  frequency?: { uuid: string } | null;
  numberOfRepeats?: number | null;
  specimenType?: { uuid: string } | null;
  specimenSource?: { uuid: string } | null;
  relatedProcedure?: { uuid: string } | null;
  category?: { uuid: string } | null;
  priority?: string | null;
};

function resolveOrderType(fullOrder: OrderResourceResponse): string {
  return fullOrder.type ?? 'procedureorder';
}

/**
 * Revises a radiology order to set scheduledDate and ON_SCHEDULED_DATE urgency.
 * OpenMRS requires a REVISE action (not PATCH) to update scheduledDate.
 */
export async function reviseOrderScheduledDate(
  order: RadiologyOrder,
  scheduledDateTime: Date | string | number,
): Promise<void> {
  const scheduledDate = dayjs(scheduledDateTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ');

  const { data: fullOrder } = await openmrsFetch<OrderResourceResponse>(`${restBaseUrl}/order/${order.uuid}`);

  const payload: Record<string, unknown> = {
    type: resolveOrderType(fullOrder),
    action: 'REVISE',
    previousOrder: order.uuid,
    patient: order.patient.uuid,
    concept: order.concept.uuid,
    careSetting: order.careSetting.uuid,
    encounter: order.encounter.uuid,
    orderer: order.orderer.uuid,
    dateActivated: order.dateActivated,
    urgency: 'ON_SCHEDULED_DATE',
    scheduledDate,
  };

  if (order.instructions) {
    payload.instructions = order.instructions;
  }
  if (order.commentToFulfiller) {
    payload.commentToFulfiller = order.commentToFulfiller;
  }
  if (order.orderReasonNonCoded) {
    payload.orderReasonNonCoded = order.orderReasonNonCoded;
  }
  if (order.orderReason?.uuid) {
    payload.orderReason = order.orderReason.uuid;
  }
  if (order.bodySite?.uuid) {
    payload.bodySite = order.bodySite.uuid;
  }
  if (order.laterality) {
    payload.laterality = order.laterality;
  }
  if (fullOrder.clinicalHistory) {
    payload.clinicalHistory = fullOrder.clinicalHistory;
  }
  if (fullOrder.frequency?.uuid) {
    payload.frequency = fullOrder.frequency.uuid;
  }
  if (fullOrder.numberOfRepeats != null) {
    payload.numberOfRepeats = fullOrder.numberOfRepeats;
  }
  if (fullOrder.specimenType?.uuid) {
    payload.specimenType = fullOrder.specimenType.uuid;
  }
  if (fullOrder.specimenSource?.uuid) {
    payload.specimenSource = fullOrder.specimenSource.uuid;
  }
  if (fullOrder.relatedProcedure?.uuid) {
    payload.relatedProcedure = fullOrder.relatedProcedure.uuid;
  }
  if (fullOrder.category?.uuid) {
    payload.category = fullOrder.category.uuid;
  }
  if (fullOrder.priority) {
    payload.priority = fullOrder.priority;
  }

  await openmrsFetch(`${restBaseUrl}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
