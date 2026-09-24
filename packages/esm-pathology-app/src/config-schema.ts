import { Type } from '@openmrs/esm-framework';

/** Histopathology Request Form UUID. */
const HISTOPATHOLOGY_REQUEST_FORM_UUID = 'a2b3c4d5-2222-4a2b-8c3d-0e1f2a3b4c5d';
/** Cytopathology Request Form UUID. */
const CYTOPATHOLOGY_REQUEST_FORM_UUID = 'a3b4c5d6-3333-4a2b-8c3d-0e1f2a3b4c5d';

const HISTOPATHOLOGY_SAMPLE_TYPE_CONCEPT_UUID = 'c2000010-2222-4a2b-8c3d-0e1f2a3b4c10';
const CYTOPATHOLOGY_SAMPLE_TYPE_CONCEPT_UUID = 'c3000010-3333-4a2b-8c3d-0e1f2a3b4c10';

const BIOPSY_ANSWER_UUID = 'c2000001-2222-4a2b-8c3d-0e1f2a3b4c01';
const FROZEN_SECTION_ANSWER_UUID = 'c2000005-2222-4a2b-8c3d-0e1f2a3b4c05';
const FNAC_ANSWER_UUID = 'c3000001-3333-4a2b-8c3d-0e1f2a3b4c01';
const FLUID_ANSWER_UUID = 'c3000002-3333-4a2b-8c3d-0e1f2a3b4c02';
const PAP_ANSWER_UUID = 'c3000003-3333-4a2b-8c3d-0e1f2a3b4c03';
const IMAGE_GUIDED_FNAC_ANSWER_UUID = 'c3000004-3333-4a2b-8c3d-0e1f2a3b4c04';

const HISTOPATHOLOGY_ORDER_CONCEPT_UUID = 'b1a7f0c2-9d34-4e51-8a26-1c2d3e4f5a60';
const FROZEN_SECTION_ORDER_CONCEPT_UUID = 'b1a7f0c4-9d34-4e51-8a26-1c2d3e4f5a62';
const FNAC_ORDER_CONCEPT_UUID = 'b2a8f1c3-9e45-4f62-9b37-2d3e4f5a6b71';
const IMAGE_GUIDED_FNAC_ORDER_CONCEPT_UUID = 'b2a8f1c4-9e45-4f62-9b37-2d3e4f5a6b72';
const FLUID_ORDER_CONCEPT_UUID = 'b2a8f1c5-9e45-4f62-9b37-2d3e4f5a6b73';
const PAP_ORDER_CONCEPT_UUID = 'b2a8f1c6-9e45-4f62-9b37-2d3e4f5a6b74';

export const configSchema = {
  /**
   * Service-area entries for the Pathology Orders workspace picker.
   * Each entry opens one request form; the form Sample type answer selects the TestOrder via sampleTypeToOrderConcept.
   */
  pathologyRequestForms: {
    _type: Type.Array,
    _description:
      'Service areas under Pathology Orders. Each entry opens a request form; Sample type on the form maps to the fixed TestOrder concept.',
    _elements: {
      id: {
        _type: Type.String,
        _description: 'Stable id for the option (used in code, not shown to the user).',
      },
      label: {
        _type: Type.String,
        _description: 'Service-area display label (e.g. Histopathology).',
      },
      formUuid: {
        _type: Type.UUID,
        _description: 'O3 form-engine form opened for this service area.',
      },
      sampleTypeConceptUuid: {
        _type: Type.UUID,
        _description: 'Concept UUID of the Sample type question on the form.',
      },
      sampleTypeToOrderConcept: {
        _type: Type.Array,
        _default: [],
        _description: 'Maps each Sample type answer concept to the TestOrder concept created after save.',
        _elements: {
          answerConceptUuid: {
            _type: Type.UUID,
            _description: 'UUID of a Sample type answer concept.',
          },
          orderConceptUuid: {
            _type: Type.UUID,
            _description: 'Concept UUID of the TestOrder created when that answer is selected.',
          },
          urgency: {
            _type: Type.String,
            _description: 'Optional OpenMRS order urgency (ROUTINE, STAT, …). Defaults to ROUTINE when omitted.',
          },
        },
      },
    },
    _default: [
      {
        id: 'histopathology',
        label: 'Histopathology',
        formUuid: HISTOPATHOLOGY_REQUEST_FORM_UUID,
        sampleTypeConceptUuid: HISTOPATHOLOGY_SAMPLE_TYPE_CONCEPT_UUID,
        sampleTypeToOrderConcept: [
          { answerConceptUuid: BIOPSY_ANSWER_UUID, orderConceptUuid: HISTOPATHOLOGY_ORDER_CONCEPT_UUID },
          {
            answerConceptUuid: FROZEN_SECTION_ANSWER_UUID,
            orderConceptUuid: FROZEN_SECTION_ORDER_CONCEPT_UUID,
            urgency: 'STAT',
          },
        ],
      },
      {
        id: 'cytopathology',
        label: 'Cytopathology',
        formUuid: CYTOPATHOLOGY_REQUEST_FORM_UUID,
        sampleTypeConceptUuid: CYTOPATHOLOGY_SAMPLE_TYPE_CONCEPT_UUID,
        sampleTypeToOrderConcept: [
          { answerConceptUuid: FNAC_ANSWER_UUID, orderConceptUuid: FNAC_ORDER_CONCEPT_UUID },
          { answerConceptUuid: IMAGE_GUIDED_FNAC_ANSWER_UUID, orderConceptUuid: IMAGE_GUIDED_FNAC_ORDER_CONCEPT_UUID },
          { answerConceptUuid: FLUID_ANSWER_UUID, orderConceptUuid: FLUID_ORDER_CONCEPT_UUID },
          { answerConceptUuid: PAP_ANSWER_UUID, orderConceptUuid: PAP_ORDER_CONCEPT_UUID },
        ],
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

export type SampleTypeOrderMapping = {
  answerConceptUuid: string;
  orderConceptUuid: string;
  /** OpenMRS order urgency; defaults to ROUTINE when omitted. Frozen section uses STAT. */
  urgency?: string;
};

export type PathologyRequestFormOption = {
  id: string;
  label: string;
  formUuid: string;
  sampleTypeConceptUuid: string;
  sampleTypeToOrderConcept: Array<SampleTypeOrderMapping>;
};

export interface PathologyConfig {
  pathologyRequestForms: Array<PathologyRequestFormOption>;
  careSettingUuid: string;
  pathologyResultConceptSetUuid: string;
  cytologyResultConceptSetUuid: string;
}
