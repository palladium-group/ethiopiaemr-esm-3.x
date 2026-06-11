import { type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { DRUG_ORDER_TEMPLATE_SCHEMA } from '../constants';
import { getErrorMessage } from '../order-templates/order-template-form.helper';
import type {
  OrderSetFormValues,
  OrderSetListItem,
  OrderSetMemberFormValues,
  OrderSetMemberListItem,
  OrderSetMemberSavePayload,
  OrderSetSavePayload,
  OrderTemplateListItem,
} from '../types';

export { getErrorMessage };

type MemberOrderTemplate = OrderTemplate & {
  drug?: string;
};

function parseMemberOrderTemplate(orderTemplate?: string): MemberOrderTemplate | undefined {
  if (!orderTemplate) {
    return undefined;
  }

  try {
    return JSON.parse(orderTemplate) as MemberOrderTemplate;
  } catch {
    return undefined;
  }
}

function findLinkedTemplateUuid(member: OrderSetMemberListItem, orderTemplates: Array<OrderTemplateListItem>): string {
  const parsedTemplate = parseMemberOrderTemplate(member.orderTemplate);
  if (!parsedTemplate) {
    return '';
  }

  const drugUuid = parsedTemplate.drug;
  if (!drugUuid) {
    return '';
  }

  const matchingTemplate = orderTemplates.find((template) => {
    if (template.drug?.uuid !== drugUuid) {
      return false;
    }

    const savedTemplate =
      typeof template.template === 'string' ? parseMemberOrderTemplate(template.template) : template.template;

    if (!savedTemplate) {
      return false;
    }

    return JSON.stringify(savedTemplate.dosingInstructions) === JSON.stringify(parsedTemplate.dosingInstructions);
  });

  return matchingTemplate?.uuid ?? '';
}

function inferDrugFromMember(
  member: OrderSetMemberListItem,
  orderTemplates: Array<OrderTemplateListItem>,
): { drugUuid: string; drugDisplay: string; conceptUuid: string } {
  const parsedTemplate = parseMemberOrderTemplate(member.orderTemplate);
  const linkedTemplateUuid = findLinkedTemplateUuid(member, orderTemplates);
  const linkedTemplate = orderTemplates.find((template) => template.uuid === linkedTemplateUuid);

  if (linkedTemplate?.drug) {
    return {
      drugUuid: linkedTemplate.drug.uuid,
      drugDisplay: linkedTemplate.drug.display ?? linkedTemplate.drug.name ?? '',
      conceptUuid: member.concept?.uuid ?? linkedTemplate.concept?.uuid ?? linkedTemplate.drug.concept?.uuid ?? '',
    };
  }

  if (parsedTemplate?.drug) {
    return {
      drugUuid: parsedTemplate.drug,
      drugDisplay: member.display ?? member.concept?.display ?? '',
      conceptUuid: member.concept?.uuid ?? '',
    };
  }

  return {
    drugUuid: '',
    drugDisplay: member.display ?? member.concept?.display ?? '',
    conceptUuid: member.concept?.uuid ?? '',
  };
}

export const emptyOrderSetFormValues: OrderSetFormValues = {
  name: '',
  description: '',
  operator: 'ALL',
  members: [],
};

export function mapOrderSetToFormValues(
  orderSet: OrderSetListItem,
  orderTemplates: Array<OrderTemplateListItem> = [],
): OrderSetFormValues {
  const activeMembers = orderSet.orderSetMembers?.filter((member) => !member.retired) ?? [];

  return {
    name: orderSet.name ?? '',
    description: orderSet.description ?? '',
    operator: orderSet.operator ?? 'ALL',
    members: activeMembers.map((member) => {
      const drug = inferDrugFromMember(member, orderTemplates);

      return {
        uuid: member.uuid,
        drugUuid: drug.drugUuid,
        drugDisplay: drug.drugDisplay,
        conceptUuid: drug.conceptUuid,
        linkedTemplateUuid: findLinkedTemplateUuid(member, orderTemplates),
      };
    }),
  };
}

function buildMemberOrderTemplate(
  member: OrderSetMemberFormValues,
  orderTemplates: Array<OrderTemplateListItem>,
): string | undefined {
  const linkedTemplate = orderTemplates.find((template) => template.uuid === member.linkedTemplateUuid);
  const linkedTemplateJson =
    typeof linkedTemplate?.template === 'string'
      ? parseMemberOrderTemplate(linkedTemplate.template)
      : (linkedTemplate?.template as MemberOrderTemplate | undefined);

  if (linkedTemplateJson) {
    const templatePayload: MemberOrderTemplate = {
      ...linkedTemplateJson,
      type: linkedTemplateJson.type ?? DRUG_ORDER_TEMPLATE_SCHEMA,
      drug: member.drugUuid,
    };

    return JSON.stringify(templatePayload);
  }

  if (!member.drugUuid) {
    return undefined;
  }

  const minimalTemplate: MemberOrderTemplate = {
    type: DRUG_ORDER_TEMPLATE_SCHEMA,
    drug: member.drugUuid,
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: {
      dose: [],
      units: [],
      route: [],
      frequency: [],
      asNeeded: false,
    },
  };

  return JSON.stringify(minimalTemplate);
}

export function mapFormValuesToSavePayload(
  values: OrderSetFormValues,
  drugOrderTypeUuid: string,
  orderTemplates: Array<OrderTemplateListItem>,
  existingUuid?: string,
  retiredMemberUuids: Array<string> = [],
): OrderSetSavePayload {
  const activeMembers: Array<OrderSetMemberFormValues> = values.members.filter((member) => member.drugUuid);

  const activeMemberPayloads = activeMembers
    .filter((member) => member.conceptUuid)
    .map((member) => ({
      uuid: member.uuid,
      concept: member.conceptUuid,
      orderType: drugOrderTypeUuid,
      orderTemplate: buildMemberOrderTemplate(member, orderTemplates),
      retired: false,
    }));

  const retiredMemberPayloads: Array<OrderSetMemberSavePayload> = retiredMemberUuids.map((uuid) => ({
    uuid,
    retired: true,
  }));

  const orderSetMembers = [...activeMemberPayloads, ...retiredMemberPayloads];

  return {
    uuid: existingUuid,
    name: values.name.trim(),
    description: values.description.trim(),
    operator: values.operator,
    orderSetMembers,
  };
}
