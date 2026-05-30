import { Type } from '@openmrs/esm-framework';
import { defaultAllOrderablesConceptUuid } from './constants';

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
};

export interface ConfigObject {
  orderCatalogEnabled: boolean;
  allOrderablesConceptUuid: string;
}
