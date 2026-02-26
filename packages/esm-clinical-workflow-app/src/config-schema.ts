import { Type } from '@openmrs/esm-framework';
import notesConfigSchema, { type VisitNoteConfigObject } from './patient-notes/visit-note-config-schema';

export const configSchema = {
  enforceTriagePrivileges: {
    _type: Type.Boolean,
    _description:
      'Enable role-based access control for triage variants. When false (default), all authenticated users can access all triage variants. When true, users must have specific privileges assigned.',
    _default: false,
  },
  triageVariants: {
    _type: Type.Object,
    _description: 'Mapping of triage variants with form configs and required privileges.',
    _default: {
      central: {
        formUuid: 'd9375924-49da-45f8-b74e-7d0454ac1c29',
        name: 'Central Triage Form',
        displayName: 'Central Triage',
        enabled: true,
        order: 0,
        privilege: 'Central Triage Access',
        patientTypes: {
          adult: {
            displayName: 'Adult',
            formUuid: 'd9375924-49da-45f8-b74e-7d0454ac1c29',
            formName: 'Central Triage - Adult',
          },
          pediatric: {
            displayName: 'Pediatric',
            formUuid: 'd9375924-49da-45f8-b74e-7d0454ac1c29',
            formName: 'Central Triage - Pediatric',
          },
          gynecology: {
            displayName: 'Gynecology',
            formUuid: 'd9375924-49da-45f8-b74e-7d0454ac1c29',
            formName: 'Central Triage - Gynecology',
          },
        },
      },
      emergency: {
        formUuid: '61c4de68-1721-45a6-b42e-f5ca6439493f',
        name: 'Emergency Triage Form',
        displayName: 'Emergency Triage',
        enabled: true,
        order: 1,
        privilege: 'Emergency Triage Access',
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
      paymentAttributesSummary: '3cc0102e-6c1f-41db-af72-4be6aa9eb27a',
    },
  },

  visitTypeUuid: {
    _type: Type.String,
    _description: 'Visit type UUID',
    _default: '3371a4d4-f66f-4454-a86d-92c7b3da990c', // Outpatient
  },
  defaultQueueStatusUuid: {
    _type: Type.String,
    _description: 'Default queue entry status UUID (e.g. Waiting status)',
    _default: '167407AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  visitQueueNumberAttributeTypeUuid: {
    _type: Type.String,
    _description: 'Visit attribute type UUID for queue number',
    _default: '14d4f066-15f5-102d-96e4-000c29c2a5d7',
  },
  identifierSourceUuid: {
    _type: Type.String,
    _description: 'Identifier source UUID',
    _default: 'fb034aac-2353-4940-abe2-7bc94e7c1e71',
  },
  defaultIdentifierTypeUuid: {
    _type: Type.String,
    _description: 'OpenMRS ID',
    _default: 'dfacd928-0370-4315-99d7-6ec1c9f7ae76',
  },
  medicoLegalCasesAttributeTypeUuid: {
    _type: Type.String,
    _description: 'Patient attribute type UUID for Medico Legal Cases',
    _default: '',
  },
  disabilityStatusAttributeTypeUuid: {
    _type: Type.String,
    _description: 'Patient attribute type UUID for Disability Status',
    _default: '',
  },
  healthIdLookupUrl: {
    _type: Type.String,
    _description:
      'Base URL for the Health ID lookup API. The healthId will be appended as a query parameter (e.g. openmrs/ws/rest/v1/module/mpi/patient → ?healthId=<value>).',
    _default: 'openmrs/ws/rest/v1/ethiopiaemrcustommodule/mpi/patient',
  },
  healthIdIdentifierTypeUuid: {
    _type: Type.String,
    _description:
      'Patient identifier type UUID used to store the Health ID in OpenMRS. Required to persist the health ID alongside the default OpenMRS identifier.',
    _default: 'cce42242-9e55-40a6-8739-1e6be1369bbe',
  },
  emergencyLocationTags: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
    },
    _description:
      'Location tag names for emergency locations. Can specify multiple tags to support future OPD/IPD emergency separation.',
    _default: ['Emergency'],
  },
  diagnosisConceptClass: {
    _type: Type.UUID,
    _default: '8d4918b0-c2cc-11de-8d13-0010c6dffd0f',
    _description: 'The concept class UUID for diagnoses',
  },
  isPrimaryDiagnosisRequired: {
    _type: Type.Boolean,
    _default: true,
    _description: 'Indicates whether a primary diagnosis is required when submitting a visit note',
  },
  visitNoteConfig: notesConfigSchema,
  disableEmptyTabs: {
    _type: Type.Boolean,
    _default: false,
    _description: 'Disable notes/tests/medications/encounters tabs when empty',
  },
  encounterEditableDuration: {
    _type: Type.Number,
    _default: 0,
    _description:
      'The number of minutes an encounter is editable after it is created. 0 means the encounter is editable forever.',
  },
  encounterEditableDurationOverridePrivileges: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
    },
    _default: [],
    _description:
      'The privileges that allow users to edit encounters even after the editable duration (set by `encounterEditableDuration`) has expired. Any privilege in the list is sufficient to edit the encounter.',
  },
  notesConceptUuids: {
    _type: Type.Array,
    _elements: {
      _type: Type.ConceptUuid,
    },
    _default: ['162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
  },
  showAllEncountersTab: {
    _type: Type.Boolean,
    _description: 'Shows the All Encounters Tab of Patient Visits section in Patient Chart',
    _default: true,
  },
  drugOrderTypeUUID: {
    _type: Type.UUID,
    _description: "UUID for the 'Drug' order type to fetch medications",
    _default: '131168f4-15f5-102d-96e4-000c29c2a5d7',
  },
  patientTransferFormUuid: {
    _type: Type.UUID,
    _description: 'UUID of the patient transfer form',
    _default: '94d5788f-6aaf-4ef6-b56e-1c71749cfa3e',
  },
  transferEncounterTypeUuid: {
    _type: Type.UUID,
    _description: 'UUID of the Intra-Hospital Transfer encounter type',
    _default: '7b68d557-85ef-4fc8-b767-4fa4f5eb5c23',
  },
  transferNoteConceptUuid: {
    _type: Type.UUID,
    _description: 'UUID of the Transfer Note concept',
    _default: 'f4162fe3-f7e3-4062-9bb3-aa1a4b1044a5',
  },
};

export interface PatientTypeConfig {
  displayName: string;
  formUuid: string;
  formName: string;
}

export interface TriageVariantConfig {
  formUuid: string;
  name: string;
  displayName: string;
  enabled: boolean;
  order: number;
  privilege: string;
  patientTypes?: Record<string, PatientTypeConfig>;
}

export type ClinicalWorkflowConfig = {
  enforceTriagePrivileges: boolean;
  triageVariants: Record<string, TriageVariantConfig>;
  defaultQueueStatusUuid: string;
  visitQueueNumberAttributeTypeUuid: string;
  billingVisitAttributeTypes: {
    paymentMethod: string;
    creditType: string;
    creditTypeDetails: string;
    freeType: string;
    paymentAttributesSummary: string;
  };
  visitTypeUuid: string;
  identifierSourceUuid: string;
  defaultIdentifierTypeUuid: string;
  medicoLegalCasesAttributeTypeUuid: string;
  disabilityStatusAttributeTypeUuid: string;
  healthIdLookupUrl: string;
  healthIdIdentifierTypeUuid: string;
  emergencyLocationTags: string[];
  patientTransferFormUuid: string;
  transferEncounterTypeUuid: string;
  transferNoteConceptUuid: string;
};

export interface VisitNoteConfig {
  diagnosisConceptClass: string;
  isPrimaryDiagnosisRequired: boolean;
  visitNoteConfig: VisitNoteConfigObject;
}

export interface ChartConfig {
  defaultFacilityUrl: string;
  disableChangingVisitLocation: boolean;
  disableEmptyTabs: boolean;
  encounterEditableDuration: number;
  encounterEditableDurationOverridePrivileges: Array<string>;
  freeTextFieldConceptUuid: string;
  logo: {
    alt: string;
    name: string;
    src: string;
  };
  notesConceptUuids: string[];
  offlineVisitTypeUuid: string;
  restrictByVisitLocationTag: boolean;
  showAllEncountersTab: boolean;
  showRecommendedVisitTypeTab: boolean;
  showServiceQueueFields: boolean; // used by extension from esm-service-queues-app
  showUpcomingAppointments: boolean; // used by extension from esm-appointments-app
  visitTypeResourceUrl: string;
  visitAttributeTypes: Array<{
    displayInThePatientBanner: boolean;
    required: boolean;
    showWhenExpression?: string;
    uuid: string;
  }>;
  visitDiagnosisConceptUuid: string;
  requireActiveVisitForEncounterTile: boolean;
  trueConceptUuid: string;
  falseConceptUuid: string;
  tileDefinitions: Array<{
    title: string;
    columns: Array<{
      title: string;
      concept: string;
      encounterType: string;
      hasSummary?: boolean;
    }>;
  }>;
  otherConceptUuid: string;
  drugOrderTypeUUID: string;
  patientTransferFormUuid: string;
  transferEncounterTypeUuid: string;
  transferNoteConceptUuid: string;
}
