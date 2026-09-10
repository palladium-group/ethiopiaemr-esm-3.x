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

export interface PathologyConfig {
  pathologyFormUuid: string;
  cytologyFormUuid: string;
  pathologyOrderConceptUuid: string;
  cytologyOrderConceptUuid: string;
  careSettingUuid: string;
  pathologyResultConceptSetUuid: string;
  cytologyResultConceptSetUuid: string;
}
