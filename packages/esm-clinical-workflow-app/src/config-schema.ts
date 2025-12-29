import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  triageLocationForms: {
    _type: Type.Object,
    _description:
      'Mapping of location UUIDs to their triage form configurations. Each location can have one triage form.',
    _default: {
      '44c3efb0-2583-4c80-a79e-1f756a03c0a1': {
        formUuid: '35093e6c-f35e-48a7-ae42-17b988d86c17',
        name: 'Central Triage Form',
      },
      '8d9045ad-50f0-45b8-93c8-3ed4bce19dbf': {
        formUuid: 'ffbe6be3-3b72-4271-a2f4-803907ca4ef4',
        name: 'Emergency Triage Form',
      },
    },
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
    _default: '7b0f5697-27e3-40c4-8bae-f4049abfb4ed', // Outpatient
  },
  identifierSourceUuid: {
    _type: Type.String,
    _description: 'Identifier source UUID',
    _default: '8549f706-7e85-4c1d-9424-217d50a2988b',
  },
  defaultIdentifierTypeUuid: {
    _type: Type.String,
    _description: 'OpenMRS ID',
    _default: '05a29f94-c0ed-11e2-94be-8c13b969e334',
  },
  medicoLegalCasesAttributeTypeUuid: {
    _type: Type.String,
    _description: 'Patient attribute type UUID for Medico Legal Cases',
    _default: '',
  },
};

export type ClinicalWorkflowConfig = {
  triageLocationForms: Record<
    string,
    {
      formUuid: string;
      name: string;
    }
  >;
  billingVisitAttributeTypes: {
    paymentMethod: string;
    creditType: string;
    creditTypeDetails: string;
    freeType: string;
  };
  visitTypeUuid: string;
  identifierSourceUuid: string;
  defaultIdentifierTypeUuid: string;
  medicoLegalCasesAttributeTypeUuid: string;
};
