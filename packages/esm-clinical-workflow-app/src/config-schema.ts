import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  triageServices: {
    _type: Type.Array,
    _description: 'List of triage services to be displayed in the triage dashboard',
    _elements: {
      formUuid: {
        _type: Type.String,
        _description: 'Form UUID for the triage service',
      },
      name: {
        _type: Type.String,
        _description: 'Name of the triage service',
      },
    },
    _default: [
      {
        formUuid: '37f6bd8d-586a-4169-95fa-5781f987fe62',
        name: 'Central Triage',
      },
      {
        formUuid: '37f6bd8d-586a-4169-95fa-5781f987fe621',
        name: 'Pediatrics Triage',
      },
      {
        formUuid: '37f6bd8d-586a-4169-95fa-5781f987fe622',
        name: 'Emergency Triage',
      },
    ],
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
  visitTypeUuid: {
    _type: Type.String,
    _description: 'Visit type UUID',
    _default: '3371a4d4-f66f-4454-a86d-92c7b3da990c',
  },
  identifierSourceUuid: {
    _type: Type.String,
    _description: 'Identifier source UUID',
    _default: 'fb034aac-2353-4940-abe2-7bc94e7c1e71',
  },
  defaultIdentifierTypeUuid: {
    _type: Type.String,
    _description: 'Default identifier type UUID',
    _default: 'dfacd928-0370-4315-99d7-6ec1c9f7ae76',
  },
};

export type ClinicalWorkflowConfig = {
  triageServices: Array<{
    formUuid: string;
    name: string;
  }>;
  billingVisitAttributeTypes: {
    paymentMethod: string;
    creditType: string;
    creditTypeDetails: string;
    freeType: string;
  };
  visitTypeUuid: string;
  identifierSourceUuid: string;
  defaultIdentifierTypeUuid: string;
};
