import { Type } from '@openmrs/esm-framework';

/** Existing Pathology Request Form UUID — reused by Biopsy/ PAP Smear and Morphology- for now. */
const PATHOLOGY_REQUEST_FORM_UUID = 'a2b3c4d5-2222-4a2b-8c3d-0e1f2a3b4c5d';
/** Existing Cytology Request Form UUID — used by FNAC/Cytology for now. */
const CYTOLOGY_REQUEST_FORM_UUID = 'a3b4c5d6-3333-4a2b-8c3d-0e1f2a3b4c5d';
const HISTOPATHOLOGY_ORDER_CONCEPT_UUID = 'b1a7f0c2-9d34-4e51-8a26-1c2d3e4f5a60';
const CYTOLOGY_ORDER_CONCEPT_UUID = 'b2a8f1c3-9e45-4f62-9b37-2d3e4f5a6b71';

export const configSchema = {
  /**
   * Pathology/cytology request form entries used for order entry and the Orders list.
   * Each entry maps a sample-type label to a request form and the fixed TestOrder created after save.
   */
  pathologyRequestForms: {
    _type: Type.Array,
    _description:
      'Request forms available under Pathology Orders. Each entry has a formUuid and orderConceptUuid for the fixed TestOrder created after save.',
    _elements: {
      id: {
        _type: Type.String,
        _description: 'Stable id for the option (used in code, not shown to the user).',
      },
      label: {
        _type: Type.String,
        _description: 'Display label (e.g. FNAC/Cytology).',
      },
      formUuid: {
        _type: Type.UUID,
        _description: 'O3 form-engine form opened for this option.',
      },
      orderConceptUuid: {
        _type: Type.UUID,
        _description: 'Concept UUID of the fixed TestOrder created after this form is saved.',
      },
    },
    _default: [
      {
        id: 'fnac-cytology',
        label: 'FNAC/Cytology',
        formUuid: CYTOLOGY_REQUEST_FORM_UUID,
        orderConceptUuid: CYTOLOGY_ORDER_CONCEPT_UUID,
      },
      {
        id: 'biopsy-pap-smear',
        label: 'Biopsy/ PAP Smear',
        formUuid: PATHOLOGY_REQUEST_FORM_UUID,
        orderConceptUuid: HISTOPATHOLOGY_ORDER_CONCEPT_UUID,
      },
      {
        id: 'morphology',
        label: 'Morphology-',
        formUuid: PATHOLOGY_REQUEST_FORM_UUID,
        orderConceptUuid: HISTOPATHOLOGY_ORDER_CONCEPT_UUID,
      },
    ],
  },
  careSettingUuid: {
    _type: Type.UUID,
    _description: 'Care setting UUID used when creating the fixed special-order TestOrder (Outpatient by default).',
    _default: '6f0c9a92-6f24-11e3-af88-005056821db0',
  },
  pathologyResultConceptSetUuid: {
    _type: Type.UUID,
    _description:
      'Concept set (Pathology Result Form) whose members are the pathology result fields rendered on the Pathology Results dashboard.',
    _default: 'c4000010-4444-4a2b-8c3d-0e1f2a3b4c10',
  },
  cytologyResultConceptSetUuid: {
    _type: Type.UUID,
    _description:
      'Concept set (Cytology Result Form) whose members are the cytology result fields rendered on the Pathology Results dashboard.',
    _default: 'c4000020-4444-4a2b-8c3d-0e1f2a3b4c20',
  },
};

export type PathologyRequestFormOption = {
  id: string;
  label: string;
  formUuid: string;
  orderConceptUuid: string;
};

export interface PathologyConfig {
  pathologyRequestForms: Array<PathologyRequestFormOption>;
  careSettingUuid: string;
  pathologyResultConceptSetUuid: string;
  cytologyResultConceptSetUuid: string;
}
