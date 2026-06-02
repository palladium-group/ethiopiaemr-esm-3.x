import { Type } from '@openmrs/esm-framework';
import { defaultAllOrderablesConceptUuid } from './constants';
import {
  defaultCareSettingUuid,
  defaultLabOrderTypeUuid,
  defaultOrderEncounterTypeUuid,
} from './api/order-catalog-basket';

export const configSchema = {
  orderCatalogEnabled: {
    _type: Type.Boolean,
    _default: false,
    _description:
      'When true, shows the Ethiopia order catalog in the order basket. When false, community search-based ordering is unchanged.',
  },
  allOrderablesConceptUuid: {
    _type: Type.ConceptUuid,
    _default: defaultAllOrderablesConceptUuid,
    _description: 'Root concept set UUID for All Orderables (lab, radiology, procedure tabs).',
  },
  orderCatalogDisplayLocale: {
    _type: Type.String,
    _default: 'en',
    _description: 'Locale used for concept display names from the REST API (e.g. en).',
  },
  labOrderTypeUuid: {
    _type: Type.UUID,
    _description:
      'Order basket grouping key for lab orders; must match @openmrs/esm-patient-tests-app orders.labOrderTypeUuid.',
    _default: defaultLabOrderTypeUuid,
  },
  careSettingUuid: {
    _type: Type.UUID,
    _description: 'Care setting UUID used when posting lab, imaging, and procedure orders.',
    _default: defaultCareSettingUuid,
  },
  orderEncounterType: {
    _type: Type.UUID,
    _description:
      'Encounter type used when signing orders from the catalog; must match @openmrs/esm-patient-orders-app orderEncounterType.',
    _default: defaultOrderEncounterTypeUuid,
  },
};

export interface ConfigObject {
  orderCatalogEnabled: boolean;
  allOrderablesConceptUuid: string;
  orderCatalogDisplayLocale: string;
  labOrderTypeUuid: string;
  careSettingUuid: string;
  orderEncounterType: string;
}
