import { type DrugOrderBasketItem, type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';
import {
  type DrugSearchResult,
  getDefault,
  getDefaultDoseUnit,
  getTemplateOrderBasketItem,
} from './drug-search.resource';
import { buildProtocolInstructions, unescapeRestText } from '../../utils/protocol-instructions';
import type { OrderSetDetail, OrderSetMemberDetail } from './order-set.resource';

export type OrderSetOperator = 'ALL' | 'ONE' | 'ANY';

const drugSearchRepresentation = 'custom:(uuid,display,name,strength,dosageForm:(display,uuid),concept:(display,uuid))';

type MemberOrderTemplate = OrderTemplate & {
  drug?: string;
};

export function getActiveOrderSetMembers(members?: Array<OrderSetMemberDetail>) {
  return members?.filter((member) => !member.retired) ?? [];
}

export function parseMemberOrderTemplate(orderTemplate?: string): MemberOrderTemplate | undefined {
  if (!orderTemplate) {
    return undefined;
  }

  try {
    return JSON.parse(orderTemplate) as MemberOrderTemplate;
  } catch {
    return undefined;
  }
}

export function getMemberDrugUuid(member: OrderSetMemberDetail): string | undefined {
  return parseMemberOrderTemplate(member.orderTemplate)?.drug;
}

export function getMemberInstructions(member: OrderSetMemberDetail): string {
  const parsedTemplate = parseMemberOrderTemplate(member.orderTemplate);
  if (!parsedTemplate?.dosingInstructions) {
    return '';
  }

  return unescapeRestText(getDefault(parsedTemplate, 'instructions')?.value);
}

export function getOrderSetInstructions(orderSet: OrderSetDetail | undefined, attributeTypeUuid: string): string {
  const attribute = orderSet?.attributes?.find((candidate) => candidate.attributeType?.uuid === attributeTypeUuid);
  return unescapeRestText(attribute?.value).trim();
}

export async function fetchDrugByUuid(drugUuid: string): Promise<DrugSearchResult> {
  const response = await openmrsFetch<DrugSearchResult>(
    `${restBaseUrl}/drug/${drugUuid}?v=${drugSearchRepresentation}`,
  );
  return response.data;
}

export async function fetchOrderSetMemberDrugs(members: Array<OrderSetMemberDetail>) {
  const drugUuids = getActiveOrderSetMembers(members)
    .map(getMemberDrugUuid)
    .filter((uuid): uuid is string => Boolean(uuid));

  const uniqueDrugUuids = [...new Set(drugUuids)];
  const drugs = await Promise.all(uniqueDrugUuids.map((uuid) => fetchDrugByUuid(uuid)));
  const drugByUuid = new Map(drugs.map((drug) => [drug.uuid, drug]));

  return { drugByUuid, missingDrugUuids: uniqueDrugUuids.filter((uuid) => !drugByUuid.has(uuid)) };
}

export function buildBasketItemFromOrderSetMember(
  drug: DrugSearchResult,
  visit: Visit,
  member: OrderSetMemberDetail,
  daysDurationUnit?: {
    uuid: string;
    display: string;
  },
  protocol?: { orderSetName: string; instructions: string },
): DrugOrderBasketItem {
  const parsedTemplate = parseMemberOrderTemplate(member.orderTemplate);

  const basketItem = parsedTemplate
    ? getTemplateOrderBasketItem(drug, visit, daysDurationUnit, {
        uuid: member.uuid,
        name: member.display ?? drug.display,
        drug,
        template: parsedTemplate,
      })
    : getTemplateOrderBasketItem(drug, visit, daysDurationUnit);

  if (protocol?.instructions) {
    basketItem.instructions = buildProtocolInstructions(protocol.orderSetName, protocol.instructions);
  }

  return basketItem;
}

export function formatMemberDosingSummary(member: OrderSetMemberDetail): string {
  const parsedTemplate = parseMemberOrderTemplate(member.orderTemplate);
  if (!parsedTemplate?.dosingInstructions) {
    return '';
  }

  const parts: Array<string> = [];
  const dose = getDefault(parsedTemplate, 'dose')?.value;
  const unit = getDefaultDoseUnit(parsedTemplate);
  const frequency = getDefault(parsedTemplate, 'frequency')?.value;
  const route = getDefault(parsedTemplate, 'route')?.value;

  if (dose != null && dose !== '') {
    parts.push(String(dose));
  }
  if (unit?.value) {
    parts.push(String(unit.value).toLowerCase());
  }
  if (frequency) {
    parts.push(String(frequency).toLowerCase());
  }
  if (route) {
    parts.push(String(route).toLowerCase());
  }

  return parts.join(' · ');
}

export function getDefaultSelectedMemberUuids(
  members: Array<OrderSetMemberDetail>,
  operator: OrderSetOperator,
): Array<string> {
  const activeMembers = getActiveOrderSetMembers(members);
  if (operator === 'ONE') {
    return activeMembers[0]?.uuid ? [activeMembers[0].uuid] : [];
  }

  return activeMembers.map((member) => member.uuid);
}

export function isMemberSelectionValid(selectedMemberUuids: Array<string>, operator: OrderSetOperator) {
  if (operator === 'ONE') {
    return selectedMemberUuids.length === 1;
  }

  return selectedMemberUuids.length > 0;
}
