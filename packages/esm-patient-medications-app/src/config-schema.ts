import { Type, validator } from '@openmrs/esm-framework';

export const configSchema = {
  daysDurationUnit: {
    uuid: {
      _type: Type.ConceptUuid,
      _default: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      _description: 'The uuid of the concept of medication duration unit in days',
    },
    display: {
      _type: Type.String,
      _description: 'The text to display in the medication duration units menu for the "days" unit.',
      _default: 'Days',
    },
  },
  drugOrderTypeUUID: {
    _type: Type.UUID,
    _description: "UUID for the 'Drug' order type to fetch medications",
    _default: '131168f4-15f5-102d-96e4-000c29c2a5d7',
  },
  orderTypeUuid: {
    _type: Type.UUID,
    _description:
      "UUID identifying this extension's order type for order basket panel filtering. Must match drugOrderTypeUUID if that value is overridden.",
    _default: '131168f4-15f5-102d-96e4-000c29c2a5d7',
  },
  showPrintButton: {
    _type: Type.Boolean,
    _default: false,
    _description:
      'Determines whether or not to display the Print button in both the active and past medications datatable headers. If set to true, a Print button gets shown in both the active and past medications table headers. When clicked, this button enables the user to print out the contents of the table',
  },
  debounceDelayInMs: {
    _type: Type.Number,
    _description:
      'Number of milliseconds to delay the search operation in the drug search input by after the user starts typing. The useDebounce hook delays the search by 300ms by default',
    _default: 300,
    _validators: [validator((v: unknown) => typeof v === 'number' && v > 0, 'Must be greater than zero')],
  },
  requireIndication: {
    _type: Type.Boolean,
    _description: 'Whether to require an indication when placing a medication order',
    _default: true,
  },
  durationUnitsDaysMap: {
    _type: Type.Object,
    _description:
      'Maps duration unit CIEL concept UUIDs to their equivalent number of days for auto-calculating dispense quantity. Months uses 30 as an approximation.',
    _default: {
      '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1, // Days
      '1073AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 7, // Weeks
      '1074AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 30, // Months
      '1734AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 365, // Years
    },
  },
  drugCategoryConceptSets: {
    _type: Type.Array,
    _description:
      'Concept Set UUIDs that define drug categories shown in the "Browse" tab, allowing users to browse drugs by category.',
    _default: [],
    _elements: {
      _type: Type.String,
    },
  },
  dtpResponse: {
    questionConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '83ab5a72-08de-48c4-94b5-e2587d722d45',
      _description: 'Concept UUID for the encounter-level DTP response obs question.',
    },
    acceptedConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '32757eaf-e2ed-41dc-a7d9-1f5650a2af5b',
      _description: 'Concept UUID for the DTP response answer meaning accepted.',
    },
    rejectedConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '01936f78-8c68-48a9-b517-ce22b1ee2c28',
      _description: 'Concept UUID for the DTP response answer meaning rejected.',
    },
    partiallyAcceptedConceptUuid: {
      _type: Type.ConceptUuid,
      _default: '1249ea8c-1723-4b34-a499-e81c787db801',
      _description: 'Concept UUID for the DTP response answer meaning partially accepted.',
    },
  },
  dtpRemark: {
    conceptUuid: {
      _type: Type.ConceptUuid,
      _default: '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      _description: 'Concept UUID for the encounter-level free-text DTP remark obs (Text datatype).',
    },
    maxLength: {
      _type: Type.Number,
      _default: 500,
      _description: 'Maximum number of characters allowed in the DTP remark field.',
      _validators: [validator((v: unknown) => typeof v === 'number' && v > 0, 'Must be greater than zero')],
    },
  },
};

export interface ConfigObject {
  daysDurationUnit: {
    uuid: string;
    display: string;
  };
  drugOrderTypeUUID: string;
  orderTypeUuid: string;
  showPrintButton: boolean;
  debounceDelayInMs: number;
  requireIndication: boolean;
  durationUnitsDaysMap: Record<string, number>;
  drugCategoryConceptSets: Array<string>;
  dtpResponse: {
    questionConceptUuid: string;
    acceptedConceptUuid: string;
    rejectedConceptUuid: string;
    partiallyAcceptedConceptUuid: string;
  };
  dtpRemark: {
    conceptUuid: string;
    maxLength: number;
  };
}
