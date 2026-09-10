import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  pathologyFormUuid: {
    _type: Type.UUID,
    _description:
      'UUID of the O3 form-engine Pathology Request Form (clinical context only). The Histopathology TestOrder is created after form save.',
    _default: 'a2b3c4d5-2222-4a2b-8c3d-0e1f2a3b4c5d',
  },
  cytologyFormUuid: {
    _type: Type.UUID,
    _description:
      'UUID of the O3 form-engine Cytology Request Form (clinical context only). The Cytology TestOrder is created after form save.',
    _default: 'a3b4c5d6-3333-4a2b-8c3d-0e1f2a3b4c5d',
  },
  pathologyOrderConceptUuid: {
    _type: Type.UUID,
    _description:
      'Concept UUID of the fixed Histopathology examination TestOrder created after the Pathology request form is saved.',
    _default: 'b1a7f0c2-9d34-4e51-8a26-1c2d3e4f5a60',
  },
  cytologyOrderConceptUuid: {
    _type: Type.UUID,
    _description:
      'Concept UUID of the fixed Cytology examination TestOrder created after the Cytology request form is saved.',
    _default: 'b2a8f1c3-9e45-4f62-9b37-2d3e4f5a6b71',
  },
  careSettingUuid: {
    _type: Type.UUID,
    _description: 'Care setting UUID used when creating the fixed special-order TestOrder (Outpatient by default).',
    _default: '6f0c9a92-6f24-11e3-af88-005056821db0',
  },
  pathologyResultLoincCodes: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _description:
      'LOINC code(s) whose returned DiagnosticReports are listed on the Pathology Results patient-chart dashboard (histopathology + cytology).',
    _default: ['11529-5', '33716-2'],
  },
};

export interface PathologyConfig {
  pathologyFormUuid: string;
  cytologyFormUuid: string;
  pathologyOrderConceptUuid: string;
  cytologyOrderConceptUuid: string;
  careSettingUuid: string;
  pathologyResultLoincCodes: Array<string>;
}
