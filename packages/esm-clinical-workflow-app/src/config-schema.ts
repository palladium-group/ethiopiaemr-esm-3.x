import { Type } from '@openmrs/esm-framework';
import notesConfigSchema, { type VisitNoteConfigObject } from './patient-notes/visit-note-config-schema';

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
    _default: '465a92f2-baf8-42e9-9612-53064be868e8',
  },
  transferNoteConceptUuid: {
    _type: Type.UUID,
    _description: 'UUID of the Transfer Note concept',
    _default: 'f4162fe3-f7e3-4062-9bb3-aa1a4b1044a5',
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
