import { type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { DRUG_ORDER_TEMPLATE_SCHEMA } from '../constants';
import { getErrorMessage, normalizeDoseUnits } from '../order-templates/order-template-form.helper';
import type {
  DoseUnitFormValue,
  OrderSetFormValues,
  OrderSetListItem,
  OrderSetMemberFormValues,
  OrderSetMemberListItem,
  OrderSetMemberSavePayload,
  OrderSetSavePayload,
} from '../types';

export { getErrorMessage };

type MemberOrderTemplate = OrderTemplate & {
  drug?: string;
};

type TemplateDoseUnit = {
  value: string;
  valueCoded?: string;
  default?: boolean;
};

function getDefaultOption<T extends { value: unknown; default?: boolean }>(options?: Array<T>) {
  return options?.find((option) => option.default) ?? options?.[0];
}

function toFormDose(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

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

function mapTemplateUnitsToFormUnits(units?: Array<TemplateDoseUnit>): Array<DoseUnitFormValue> {
  if (!units?.length) {
    return [];
  }

  return normalizeDoseUnits(
    units
      .filter((unit) => Boolean(unit.valueCoded))
      .map((unit) => ({
        uuid: unit.valueCoded ?? '',
        display: String(unit.value ?? ''),
        isDefault: Boolean(unit.default),
      })),
  );
}

export const emptyOrderSetMemberFormValues: OrderSetMemberFormValues = {
  drugUuid: '',
  drugDisplay: '',
  conceptUuid: '',
  dose: null,
  doseUnits: [],
  routeUuid: '',
  routeDisplay: '',
  frequencyUuid: '',
  frequencyDisplay: '',
  asNeeded: false,
  asNeededCondition: '',
};

export const emptyOrderSetFormValues: OrderSetFormValues = {
  name: '',
  description: '',
  operator: 'ALL',
  members: [],
};

function mapMemberOrderTemplateToFormValues(
  member: OrderSetMemberListItem,
  parsedTemplate?: MemberOrderTemplate,
): OrderSetMemberFormValues {
  const dosingInstructions = parsedTemplate?.dosingInstructions as
    | (OrderTemplate['dosingInstructions'] & {
        unit?: Array<TemplateDoseUnit>;
        units?: Array<TemplateDoseUnit>;
      })
    | undefined;
  const dose = getDefaultOption(dosingInstructions?.dose);
  const route = getDefaultOption(dosingInstructions?.route);
  const frequency = getDefaultOption(dosingInstructions?.frequency);

  return {
    uuid: member.uuid,
    drugUuid: parsedTemplate?.drug ?? '',
    drugDisplay: member.display ?? member.concept?.display ?? '',
    conceptUuid: member.concept?.uuid ?? '',
    dose: toFormDose(dose?.value),
    doseUnits: mapTemplateUnitsToFormUnits(dosingInstructions?.units ?? dosingInstructions?.unit),
    routeUuid: (route as { valueCoded?: string } | undefined)?.valueCoded ?? '',
    routeDisplay: String(route?.value ?? ''),
    frequencyUuid: (frequency as { valueCoded?: string } | undefined)?.valueCoded ?? '',
    frequencyDisplay: String(frequency?.value ?? ''),
    asNeeded: Boolean(dosingInstructions?.asNeeded),
    asNeededCondition: dosingInstructions?.asNeededCondition ?? '',
  };
}

export function mapOrderSetToFormValues(orderSet: OrderSetListItem): OrderSetFormValues {
  const activeMembers = orderSet.orderSetMembers?.filter((member) => !member.retired) ?? [];

  return {
    name: orderSet.name ?? '',
    description: orderSet.description ?? '',
    operator: orderSet.operator ?? 'ALL',
    members: activeMembers.map((member) =>
      mapMemberOrderTemplateToFormValues(member, parseMemberOrderTemplate(member.orderTemplate)),
    ),
  };
}

function buildMemberOrderTemplate(member: OrderSetMemberFormValues): string | undefined {
  if (!member.drugUuid) {
    return undefined;
  }

  const doseValue = member.dose;
  const doseUnits = normalizeDoseUnits(member.doseUnits);

  const template: MemberOrderTemplate = {
    type: DRUG_ORDER_TEMPLATE_SCHEMA,
    drug: member.drugUuid,
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: {
      dose: doseValue != null && !Number.isNaN(doseValue) ? [{ value: doseValue, default: true }] : [],
      units: doseUnits.map((unit) => ({
        value: unit.display,
        valueCoded: unit.uuid,
        default: unit.isDefault,
      })),
      route: member.routeUuid ? [{ value: member.routeDisplay, valueCoded: member.routeUuid, default: true }] : [],
      frequency: member.frequencyUuid
        ? [{ value: member.frequencyDisplay, valueCoded: member.frequencyUuid, default: true }]
        : [],
      asNeeded: member.asNeeded,
      asNeededCondition: member.asNeeded ? member.asNeededCondition || undefined : undefined,
    },
  };

  return JSON.stringify(template);
}

export function mapFormValuesToSavePayload(
  values: OrderSetFormValues,
  drugOrderTypeUuid: string,
  existingUuid?: string,
  retiredMemberUuids: Array<string> = [],
): OrderSetSavePayload {
  const activeMembers = values.members.filter((member) => member.drugUuid && member.conceptUuid);

  const activeMemberPayloads = activeMembers.map((member) => ({
    uuid: member.uuid,
    concept: member.conceptUuid,
    orderType: drugOrderTypeUuid,
    orderTemplate: buildMemberOrderTemplate(member),
    retired: false,
  }));

  const retiredMemberPayloads: Array<OrderSetMemberSavePayload> = retiredMemberUuids.map((uuid) => ({
    uuid,
    retired: true,
  }));

  return {
    uuid: existingUuid,
    name: values.name.trim(),
    description: values.description.trim(),
    operator: values.operator,
    orderSetMembers: [...activeMemberPayloads, ...retiredMemberPayloads],
  };
}
