import { type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import type { OrderSetOperator } from '../constants';

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

export interface DoseUnitFormValue {
  uuid: string;
  display: string;
  isDefault: boolean;
}

export interface OrderTemplateFormValues {
  name: string;
  description: string;
  drugUuid: string;
  drugDisplay: string;
  conceptUuid: string;
  dose: number | null;
  doseUnits: Array<DoseUnitFormValue>;
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
  template: string;
}

export interface OrderSetMemberListItem {
  uuid: string;
  display?: string;
  retired: boolean;
  concept?: ConceptReference;
  orderType?: {
    uuid: string;
    display: string;
  };
  orderTemplate?: string;
  orderTemplateType?: string;
}

export interface OrderSetListItem {
  uuid: string;
  name: string;
  description?: string;
  retired: boolean;
  operator: OrderSetOperator;
  orderSetMembers?: Array<OrderSetMemberListItem>;
}

export interface OrderSetMemberFormValues {
  uuid?: string;
  drugUuid: string;
  drugDisplay: string;
  conceptUuid: string;
  dose: number | null;
  doseUnits: Array<DoseUnitFormValue>;
  routeUuid: string;
  routeDisplay: string;
  frequencyUuid: string;
  frequencyDisplay: string;
  asNeeded: boolean;
  asNeededCondition: string;
  retired?: boolean;
}

export interface OrderSetFormValues {
  name: string;
  description: string;
  operator: OrderSetOperator;
  members: Array<OrderSetMemberFormValues>;
}

export interface OrderSetMemberSavePayload {
  uuid?: string;
  concept?: string;
  orderType?: string;
  orderTemplate?: string;
  retired?: boolean;
}

export interface OrderSetSavePayload {
  uuid?: string;
  name: string;
  description: string;
  operator: OrderSetOperator;
  orderSetMembers: Array<OrderSetMemberSavePayload>;
}
