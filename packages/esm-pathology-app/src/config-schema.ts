import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  pathologyFormUuid: {
    _type: Type.UUID,
    _description:
      'UUID of the O3 form-engine Pathology Request Form. The form carries the histopathology order and observations the OpenELIS PATH workflow needs.',
    _default: 'a2b3c4d5-2222-4a2b-8c3d-0e1f2a3b4c5d',
  },
  cytologyFormUuid: {
    _type: Type.UUID,
    _description:
      'UUID of the O3 form-engine Cytology Request Form. The form carries the cytology order and observations the OpenELIS CYTO workflow needs.',
    _default: 'a3b4c5d6-3333-4a2b-8c3d-0e1f2a3b4c5d',
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
  pathologyResultLoincCodes: Array<string>;
}
