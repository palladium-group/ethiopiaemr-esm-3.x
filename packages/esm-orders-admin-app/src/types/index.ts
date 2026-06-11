import { type OrderTemplate } from '@openmrs/esm-patient-common-lib';

export interface DrugReference {
  uuid: string;
  display: string;
  name?: string;
  concept?: {
    uuid: string;
    display: string;
  };
}

export interface ConceptReference {
  uuid: string;
  display: string;
}

export interface OrderTemplateListItem {
  uuid: string;
  name: string;
  description?: string;
  retired: boolean;
  drug?: DrugReference;
  concept?: ConceptReference;
  template?: string | OrderTemplate;
}

export interface OrderTemplateFormValues {
  name: string;
  description: string;
  drugUuid: string;
  drugDisplay: string;
  conceptUuid: string;
  dose: number | '';
  unitUuid: string;
  unitDisplay: string;
  routeUuid: string;
  routeDisplay: string;
  frequencyUuid: string;
  frequencyDisplay: string;
  asNeeded: boolean;
  asNeededCondition: string;
}

export interface DrugSearchResult {
  uuid: string;
  display: string;
  name: string;
  concept: {
    uuid: string;
    display: string;
  };
}

export interface OrderTemplateSavePayload {
  uuid?: string;
  name: string;
  description: string;
  concept: string;
  drug: string;
  template: OrderTemplate;
}
