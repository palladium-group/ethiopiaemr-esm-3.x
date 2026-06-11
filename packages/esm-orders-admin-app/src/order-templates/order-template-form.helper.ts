import { type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { DRUG_ORDER_TEMPLATE_SCHEMA } from '../constants';
import type { OrderTemplateFormValues, OrderTemplateListItem, OrderTemplateSavePayload } from '../types';

function getDefaultOption<T extends { value: unknown; default?: boolean }>(options?: Array<T>) {
  return options?.find((option) => option.default) ?? options?.[0];
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

export const emptyOrderTemplateFormValues: OrderTemplateFormValues = {
  name: '',
  description: '',
  drugUuid: '',
  drugDisplay: '',
  conceptUuid: '',
  dose: '',
  unitUuid: '',
  unitDisplay: '',
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
        unit?: Array<{ value: string; valueCoded?: string; default?: boolean }>;
        units?: Array<{ value: string; valueCoded?: string; default?: boolean }>;
      })
    | undefined;
  const dose = getDefaultOption(dosingInstructions?.dose);
  const unit = getDefaultOption(dosingInstructions?.unit) ?? getDefaultOption(dosingInstructions?.units);
  const route = getDefaultOption(dosingInstructions?.route);
  const frequency = getDefaultOption(dosingInstructions?.frequency);

  return {
    name: orderTemplate.name ?? '',
    description: orderTemplate.description ?? '',
    drugUuid: orderTemplate.drug?.uuid ?? '',
    drugDisplay: orderTemplate.drug?.display ?? orderTemplate.drug?.name ?? '',
    conceptUuid: orderTemplate.concept?.uuid ?? orderTemplate.drug?.concept?.uuid ?? '',
    dose: typeof dose?.value === 'number' ? dose.value : '',
    unitUuid: (unit as { valueCoded?: string } | undefined)?.valueCoded ?? '',
    unitDisplay: String(unit?.value ?? ''),
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
  const doseValue = values.dose === '' ? null : Number(values.dose);

  const template: OrderTemplate = {
    type: DRUG_ORDER_TEMPLATE_SCHEMA,
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: {
      dose: doseValue != null && !Number.isNaN(doseValue) ? [{ value: doseValue, default: true }] : [],
      units: values.unitUuid ? [{ value: values.unitDisplay, valueCoded: values.unitUuid, default: true }] : [],
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
    template,
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
