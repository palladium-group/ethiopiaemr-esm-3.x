import { type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { DRUG_ORDER_TEMPLATE_SCHEMA } from '../constants';
import type {
  DoseUnitFormValue,
  OrderTemplateFormValues,
  OrderTemplateListItem,
  OrderTemplateSavePayload,
} from '../types';

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

function parseTemplateJson(template: OrderTemplateListItem['template']): OrderTemplate | undefined {
  if (!template) {
    return undefined;
  }

  if (typeof template === 'string') {
    try {
      return JSON.parse(template) as OrderTemplate;
    } catch {
      return undefined;
    }
  }

  return template;
}

type TemplateDoseUnit = {
  value: string;
  valueCoded?: string;
  default?: boolean;
};

export function normalizeDoseUnits(units: Array<DoseUnitFormValue>): Array<DoseUnitFormValue> {
  if (units.length === 0) {
    return [];
  }

  const defaultIndex = units.findIndex((unit) => unit.isDefault);
  const resolvedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;

  return units.map((unit, index) => ({
    ...unit,
    isDefault: index === resolvedDefaultIndex,
  }));
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

export const emptyOrderTemplateFormValues: OrderTemplateFormValues = {
  name: '',
  description: '',
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

export function mapOrderTemplateToFormValues(orderTemplate: OrderTemplateListItem): OrderTemplateFormValues {
  const parsedTemplate = parseTemplateJson(orderTemplate.template);
  const dosingInstructions = parsedTemplate?.dosingInstructions as
    | (OrderTemplate['dosingInstructions'] & {
        unit?: Array<TemplateDoseUnit>;
        units?: Array<TemplateDoseUnit>;
      })
    | undefined;
  const dose = getDefaultOption(dosingInstructions?.dose);
  const route = getDefaultOption(dosingInstructions?.route);
  const frequency = getDefaultOption(dosingInstructions?.frequency);
  const doseUnits = mapTemplateUnitsToFormUnits(dosingInstructions?.units ?? dosingInstructions?.unit);

  return {
    name: orderTemplate.name ?? '',
    description: orderTemplate.description ?? '',
    drugUuid: orderTemplate.drug?.uuid ?? '',
    drugDisplay: orderTemplate.drug?.display ?? orderTemplate.drug?.name ?? '',
    conceptUuid: orderTemplate.concept?.uuid ?? orderTemplate.drug?.concept?.uuid ?? '',
    dose: toFormDose(dose?.value),
    doseUnits,
    routeUuid: (route as { valueCoded?: string } | undefined)?.valueCoded ?? '',
    routeDisplay: String(route?.value ?? ''),
    frequencyUuid: (frequency as { valueCoded?: string } | undefined)?.valueCoded ?? '',
    frequencyDisplay: String(frequency?.value ?? ''),
    asNeeded: Boolean(dosingInstructions?.asNeeded),
    asNeededCondition: dosingInstructions?.asNeededCondition ?? '',
  };
}

export function mapFormValuesToSavePayload(
  values: OrderTemplateFormValues,
  existingUuid?: string,
): OrderTemplateSavePayload {
  const doseValue = values.dose;
  const doseUnits = normalizeDoseUnits(values.doseUnits);

  const template: OrderTemplate = {
    type: DRUG_ORDER_TEMPLATE_SCHEMA,
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: {
      dose: doseValue != null && !Number.isNaN(doseValue) ? [{ value: doseValue, default: true }] : [],
      units: doseUnits.map((unit) => ({
        value: unit.display,
        valueCoded: unit.uuid,
        default: unit.isDefault,
      })),
      route: values.routeUuid ? [{ value: values.routeDisplay, valueCoded: values.routeUuid, default: true }] : [],
      frequency: values.frequencyUuid
        ? [{ value: values.frequencyDisplay, valueCoded: values.frequencyUuid, default: true }]
        : [],
      asNeeded: values.asNeeded,
      asNeededCondition: values.asNeeded ? values.asNeededCondition || undefined : undefined,
    },
  };

  return {
    uuid: existingUuid,
    name: values.name.trim(),
    description: values.description.trim(),
    concept: values.conceptUuid,
    drug: values.drugUuid,
    template: JSON.stringify(template),
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}
