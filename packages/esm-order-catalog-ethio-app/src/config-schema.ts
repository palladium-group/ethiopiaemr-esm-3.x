import { Type } from '@openmrs/esm-framework';
import { defaultAllOrderablesConceptUuid } from './constants';
import {
  defaultCareSettingUuid,
  defaultLabOrderTypeUuid,
  defaultOrderEncounterTypeUuid,
  defaultProcedureOrderTypeUuid,
  defaultRadiologyOrderTypeUuid,
} from './api/order-catalog-basket';

export const configSchema = {
  orderCatalogEnabled: {
    _type: Type.Boolean,
    _default: false,
    _description:
      'When true, shows the All orderables catalog in the order basket and hides legacy lab, imaging, and procedure panels. When false, legacy ordering is unchanged.',
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
  radiologyOrderTypeUuid: {
    _type: Type.UUID,
    _description:
      'OpenMRS order type UUID for radiology catalog orders; must match @kenyaemr/esm-imaging-orders-app orders.radiologyOrderTypeUuid.',
    _default: defaultRadiologyOrderTypeUuid,
  },
  procedureOrderTypeUuid: {
    _type: Type.UUID,
    _description:
      'OpenMRS order type UUID for procedure catalog orders; must match @kenyaemr/esm-procedure-orders-app procedureOrderTypeUuid.',
    _default: defaultProcedureOrderTypeUuid,
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
  radiologyOrderTypeUuid: string;
  procedureOrderTypeUuid: string;
  careSettingUuid: string;
  orderEncounterType: string;
}
