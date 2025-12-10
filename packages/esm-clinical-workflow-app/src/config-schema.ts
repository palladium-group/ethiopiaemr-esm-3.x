import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  triageServices: {
    _type: Type.Array,
    _description: 'List of triage services to be displayed in the triage dashboard',
    _elements: { _type: Type.String },
    _default: ['Central Triage', 'Pediatrics Triage', 'Emergency Triage'],
  },
  billingVisitAttributeTypes: {
    _type: Type.Object,
    _description: 'Visit attribute type UUIDs for billing information',
    _default: {
      paymentMethod: 'e6cb0c3b-04b0-4117-9bc6-ce24adbda802',
      creditType: '5cd1eb62-e006-4146-bd22-80bc4d5bd2f7',
      creditTypeDetails: 'd824aa96-d2c7-4a52-aa8d-03f60a516083',
      freeType: '7523ecfe-b8f1-4e7f-80a7-1a495b15ace4',
    },
  },
};

export type ClinicalWorkflowConfig = {
  triageServices: Array<string>;
  billingVisitAttributeTypes: {
    paymentMethod: string;
    creditType: string;
    creditTypeDetails: string;
    freeType: string;
  };
};
