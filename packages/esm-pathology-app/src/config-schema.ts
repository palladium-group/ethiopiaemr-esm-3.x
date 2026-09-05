import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  pathologyFormUuid: {
    _type: Type.UUID,
    _description:
      'UUID of the O3 form-engine pathology order form (Pathology_Order_Form.json in the content repo). The form carries both the pathology order and the observations the OpenELIS pathology workflow needs.',
    _default: 'a1b2c3d4-1111-4a2b-8c3d-0e1f2a3b4c5d',
  },
  pathologyResultLoincCodes: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _description:
      'LOINC code(s) whose returned DiagnosticReports are listed on the Pathology Results patient-chart dashboard.',
    _default: ['11529-5'],
  },
};

export interface PathologyConfig {
  pathologyFormUuid: string;
  pathologyResultLoincCodes: Array<string>;
}
