import { Type, validator } from '@openmrs/esm-framework';
import notesConfigSchema, { type VisitNoteConfigObject } from './patient-notes/visit-note-config-schema';
import { Permissions } from './permission/permissions.constants';

/** Default for `mrnNumberLength`. Runtime code should use `useConfig<ClinicalWorkflowConfig>().mrnNumberLength`. */
export const DEFAULT_MRN_NUMBER_LENGTH = 6;

export const configSchema = {
  enforceTriagePrivileges: {
    _type: Type.Boolean,
    _description:
      'Enable role-based access control for triage variants. When false (default), all authenticated users can access all triage variants. When true, users must have specific privileges assigned.',
    _default: false,
  },
  triageDefinitions: {
    _type: Type.Array,
    _description:
      'Triage entry points shown as home sidebar links when enabled. Each item needs a stable `id`. Dashboard and homepage link extensions are registered at runtime from this list. After registering a new patient, the configured triage form opens directly. Default `routePath` is `${id}-triage` when `routePath` is left empty.',
    _default: [
      {
        id: 'adult',
        formUuid: 'ff723d59-0650-4b84-858d-c1045b690683',
        name: 'Adult Triage Form',
        displayName: 'Adult Triage',
        enabled: true,
        order: 0,
        privilege: Permissions.ViewAdultTriageDashboard,
      },
      {
        id: 'pediatric',
        formUuid: '070e7d10-c6b8-4540-9718-5908738039c3',
        name: 'Pediatrics Emergency Triage Form',
        displayName: 'Pediatric Triage',
        enabled: true,
        order: 1,
        privilege: Permissions.ViewPediatricTriageDashboard,
      },
      {
        id: 'emergency',
        formUuid: '4ff622f8-212e-4f0f-b6a6-1aa19d776ffb',
        name: 'Emergency Triage Form',
        displayName: 'Emergency Triage',
        enabled: true,
        order: 2,
        privilege: Permissions.ViewEmergencyTriageDashboard,
        routePath: 'emergency-triage',
      },
      {
        id: 'gynecological',
        formUuid: '1df88856-d54e-43e9-8ed2-dafde77c6081',
        name: 'GYN Triage Form',
        displayName: 'Gynecological Triage',
        enabled: true,
        order: 3,
        privilege: Permissions.ViewGynecologicalTriageDashboard,
      },
      {
        id: 'psychiatry',
        formUuid: 'fe0f8f4c-98ae-46a6-a882-66e61ef4b500',
        name: 'Psychiatry Triage',
        displayName: 'Psychiatry Triage',
        enabled: true,
        order: 4,
        privilege: Permissions.ViewPsychiatryTriageDashboard,
      },
    ],
    _elements: {
      id: {
        _type: Type.String,
        _description: 'Stable key for this triage (used in extension names and config lookups).',
      },
      formUuid: {
        _type: Type.UUID,
        _description: 'Form resource UUID opened for this triage after registration or from the triage banner.',
      },
      name: {
        _type: Type.String,
        _description: 'Form name label for the default triage form.',
      },
      displayName: {
        _type: Type.String,
        _description: 'Title shown in the sidebar and triage landing page header.',
      },
      enabled: {
        _type: Type.Boolean,
        _default: true,
      },
      order: {
        _type: Type.Number,
        _default: 0,
        _description: 'Relative order for listing triage definitions.',
      },
      privilege: {
        _type: Type.String,
        _description: 'Privilege checked when enforceTriagePrivileges is true.',
      },
      routePath: {
        _type: Type.String,
        _default: '',
        _description: 'Home sub-path for this triage. Leave empty to use `${id}-triage`.',
      },
      patientTypes: {
        _type: Type.Object,
        _default: {},
        _description: 'Deprecated; not used. Triage uses `formUuid` and `name` only.',
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
      paymentAttributesSummary: '3cc0102e-6c1f-41db-af72-4be6aa9eb27a',
      cbhi: {
        id: 'b4382a14-9d76-4615-87ae-c1457fa541f9',
        fullName: 'c242e7cf-a8bc-485a-878e-87bdf36575d3',
        accountNo: '6f5b3f9d-1dc6-4871-be4a-c7c59205ccac',
        membershipType: '935bb6fd-3aa0-4556-b4ec-8e227811579e',
        cbhiId: '2333b8ae-732a-4f0f-a192-ae84e1793071',
        insuredId: '7dc76b96-e889-48b4-aa26-3e2ac0add8d4',
      },
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
  finishedServiceQueueStatusUuid: {
    _type: Type.String,
    _description:
      'Queue entry status UUID used when finishing service from the patient chart banner (e.g. Finished Service)',
    _default: '167409AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  visitQueueNumberAttributeTypeUuid: {
    _type: Type.String,
    _description: 'Visit attribute type UUID for queue number',
    _default: '14d4f066-15f5-102d-96e4-000c29c2a5d7',
  },
  triageVisitAttributeTypeUuid: {
    _type: Type.UUID,
    _description:
      'Visit attribute type UUID that stores the triage definition id on visits created from a triage page.',
    _default: 'c1f592f3-3c6e-44c9-ac2d-ddab90f705ba',
  },
  assignedQueueVisitAttributeTypeUuid: {
    _type: Type.UUID,
    _description: 'Visit attribute type UUID that stores the queue location assigned after triage.',
    _default: 'b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473',
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
    _description:
      'Person attribute type UUID for disability type. Stored as a semicolon-separated list: `none`, or tokens `vision_loss`, `hearing_loss`, `mobility_impairment`, and optionally `other:<free text>`.',
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
  mrnNumberLength: {
    _type: Type.Number,
    _description:
      'Required digit length for the optional MRN field on triage patient registration. When provided, the value must be numeric and exactly this many digits.',
    _default: DEFAULT_MRN_NUMBER_LENGTH,
    _validators: [validator((v) => Number.isInteger(v) && v > 0, 'Must be a positive integer.')],
  },
  mrnIdentifierTypeUuid: {
    _type: Type.String,
    _description:
      'Patient identifier type UUID used to persist the optional MRN on patient registration. When empty, the MRN is validated in the form but not saved as an identifier. The identifier type metadata should set uniqueness behavior to UNIQUE (see mrn_number.csv).',
    _default: '',
  },
  bloodTypeAttributeTypeUuid: {
    _type: Type.String,
    _description:
      'Person attribute type UUID for storing blood type (e.g. "A+", "O-", "B+"). If not set, blood type from Health ID lookup will not be persisted.',
    _default: '',
  },
  phoneAttributeTypeUuid: {
    _type: Type.String,
    _description:
      'Person attribute type UUID for storing phone number. If not set, phone number from Health ID lookup will not be persisted.',
    _default: '',
  },
  emailAttributeTypeUuid: {
    _type: Type.String,
    _description:
      'Person attribute type UUID for storing email address. If not set, email from Health ID lookup will not be persisted.',
    _default: '',
  },
  allergySeverityConceptUuids: {
    _type: Type.Object,
    _description:
      'Concept UUIDs for allergy severity levels. Used to map severity strings from Health ID to OpenMRS concepts.',
    _default: {
      mild: '1498AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      moderate: '1499AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      severe: '1500AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
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
  medicalRecordingUnitLocationTagUuid: {
    _type: Type.UUID,
    _description:
      'Location tag UUID used to identify locations (e.g. MRU) that should see visits from all locations (no location filter).',
    _default: 'b2b1f7aa-4c4f-4f26-8a45-6c8a1f5b2b2b',
  },
  medicalRecordingUnitLocationTagName: {
    _type: Type.String,
    _description:
      'Fallback location tag name used when the configured MRU tag UUID does not match server data. Match is case-insensitive against tag display.',
    _default: 'Medical Recording Unit',
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
  admissionRequestFormUuid: {
    _type: Type.UUID,
    _description: 'UUID of the admission request form used to request inpatient admission',
    _default: '5e725bad-750e-4d31-b4bc-cab4c9ea63ff',
  },
  admissionRequestFormName: {
    _type: Type.String,
    _description: 'Display name for the admission request form workspace title',
    _default: 'Admission Request Form',
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
  transferDestinationLocationConceptUuid: {
    _type: Type.UUID,
    _description:
      'UUID of the destination location concept on the patient transfer form (must match the ui-select-extended field concept)',
    _default: 'e7fafac8-1490-4370-b47e-1c6baeae9cf7',
  },
  recentDiagnosesCount: {
    _type: Type.Number,
    _default: 5,
    _description: 'Maximum number of recent diagnoses to display in the Recent Diagnoses widget.',
    _validators: [validator((v) => Number.isInteger(v) && v > 0, 'Must be a positive integer.')],
  },
  immunizationFormUuid: {
    _type: Type.UUID,
    _default: '4ab5c6d7-e8f9-4012-3901-4c5d6e7f8901',
  },
  immunizationFormName: {
    _type: Type.String,
    _default: 'Routine Immunization Register',
  },
  inpatientOrderSheetFormUuid: {
    _type: Type.UUID,
    _description: 'UUID of the Inpatient Order Sheet form',
    _default: '038fea05-4091-4a08-a24c-5fc7e4d11b82',
  },
  ipdDischargeEncounterTypeUuid: {
    _type: Type.UUID,
    _description: 'IPD Discharge encounter type UUID (doctor clinical discharge form)',
    _default: '7e618d13-ffdb-4650-9a97-10ccd16ca36d',
  },
  nurseDischargeConfirmationEncounterTypeUuid: {
    _type: Type.UUID,
    _description: 'Encounter type created when a nurse confirms discharge readiness',
    _default: '3219a73c-a168-4b5b-85e0-4de306d0aed4',
  },
  nurseDischargeConfirmationConceptUuid: {
    _type: Type.UUID,
    _description: 'Obs concept for nurse confirmed discharge readiness',
    _default: 'f41cb314-b8b2-4a84-8071-dcfdabc2a040',
  },
  nurseDischargeConfirmationYesConceptUuid: {
    _type: Type.UUID,
    _description: 'Coded Yes answer concept stored on nurse discharge confirmation obs',
    _default: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  legacySummaryDisplayEnabled: {
    _type: Type.Boolean,
    _default: true,
    _description: 'When false, hides the Legacy Summary patient chart dashboard tab.',
  },
};

export interface PatientTypeConfig {
  displayName: string;
  formUuid: string;
  formName: string;
}

export interface TriageDefinitionConfig {
  id: string;
  formUuid: string;
  name: string;
  displayName: string;
  enabled: boolean;
  order: number;
  privilege: string;
  /** When unset or empty, routes use `${id}-triage`. */
  routePath?: string;
  /** @deprecated Not used; kept for config compatibility. */
  patientTypes?: Record<string, PatientTypeConfig>;
}

export type ClinicalWorkflowConfig = {
  enforceTriagePrivileges: boolean;
  triageDefinitions: Array<TriageDefinitionConfig>;
  defaultQueueStatusUuid: string;
  finishedServiceQueueStatusUuid: string;
  visitQueueNumberAttributeTypeUuid: string;
  triageVisitAttributeTypeUuid: string;
  assignedQueueVisitAttributeTypeUuid: string;
  billingVisitAttributeTypes: {
    paymentMethod: string;
    creditType: string;
    creditTypeDetails: string;
    paymentAttributesSummary: string;
    cbhi: {
      id: string;
      fullName: string;
      accountNo: string;
      membershipType: string;
      cbhiId: string;
      insuredId: string;
    };
  };
  visitTypeUuid: string;
  identifierSourceUuid: string;
  defaultIdentifierTypeUuid: string;
  medicoLegalCasesAttributeTypeUuid: string;
  disabilityStatusAttributeTypeUuid: string;
  healthIdLookupUrl: string;
  healthIdIdentifierTypeUuid: string;
  mrnNumberLength: number;
  mrnIdentifierTypeUuid: string;
  bloodTypeAttributeTypeUuid: string;
  phoneAttributeTypeUuid: string;
  emailAttributeTypeUuid: string;
  allergySeverityConceptUuids: {
    mild: string;
    moderate: string;
    severe: string;
  };
  emergencyLocationTags: string[];
  medicalRecordingUnitLocationTagUuid: string;
  medicalRecordingUnitLocationTagName: string;
  admissionRequestFormUuid: string;
  admissionRequestFormName: string;
  patientTransferFormUuid: string;
  transferEncounterTypeUuid: string;
  transferNoteConceptUuid: string;
  transferDestinationLocationConceptUuid: string;
  recentDiagnosesCount: number;
  inpatientOrderSheetFormUuid: string;
  ipdDischargeEncounterTypeUuid: string;
  nurseDischargeConfirmationEncounterTypeUuid: string;
  nurseDischargeConfirmationConceptUuid: string;
  nurseDischargeConfirmationYesConceptUuid: string;
  legacySummaryDisplayEnabled: boolean;
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
  transferDestinationLocationConceptUuid: string;
}

export interface ImmunizationRegisterConfig {
  immunizationFormUuid: string;
  immunizationFormName: string;
}
