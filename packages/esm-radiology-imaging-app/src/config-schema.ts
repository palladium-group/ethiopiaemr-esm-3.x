import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  radiologyConceptSetUuid: {
    _type: Type.ConceptUuid,
    _description: 'The UUID of the Radiology Concept Set concept.',
    _default: '164068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  radiologyConceptClassUuid: {
    _type: Type.String,
    _description: 'Radiology Concept Class UUID',
    _default: '8caa332c-efe4-4025-8b18-3398328e1323',
  },
  radiologyOrderTypeUuid: {
    _type: Type.UUID,
    _description: "UUID for the 'Radiology' order type",
    _default: 'b4a7c280-369e-4d12-9ce8-18e36783fed6',
  },
  pacsBaseUrl: {
    _type: Type.String,
    _description: 'Base URL of the PACS server (e.g. Orthanc). Used to post modality worklist entries.',
    _default: 'http://localhost:8042',
  },
  pacsUsername: {
    _type: Type.String,
    _description: 'PACS server username for Basic authentication.',
    _default: 'admin',
  },
  pacsPassword: {
    _type: Type.String,
    _description: 'PACS server password for Basic authentication.',
    _default: 'Admin123',
  },
  scheduledStationAETitle: {
    _type: Type.String,
    _description: 'DICOM Application Entity (AE) title of the target imaging modality station.',
    _default: 'KENYAEMR',
  },
  worklistWriterBaseUrl: {
    _type: Type.String,
    _description:
      'Base URL of the worklist-writer sidecar service. Used to check whether a worklist entry exists for a given order.',
    _default: 'http://localhost:8000',
  },
  renalFunctionTestConceptUuid: {
    _type: Type.ConceptUuid,
    _description: 'The UUID of the Renal Function Test Concept.',
    _default: '164068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  radiologyOrdersRequiringRenalFunctionCheck: {
    _type: Type.Array,
    _description:
      'Radiology procedures that require recent renal function lab results before ordering. For each configured procedure, the system checks whether a valid lab result exists within the specified time window and warns the clinician if none is found.',
    _elements: {
      procedureConceptUuid: {
        _type: Type.ConceptUuid,
        _description:
          'UUID of the radiology procedure concept that triggers the renal function check (e.g. contrast-enhanced CT scan).',
      },
      labResultValidityPeriodInDays: {
        _type: Type.Number,
        _description:
          'Number of days a renal function lab result remains valid. Results older than this will trigger a warning to the clinician.',
      },
    },
    _default: [],
  },
  radiologyAppointmentLocationUuid: {
    _type: Type.UUID,
    _description:
      'Optional default location UUID pre-selected in the appointment scheduling form. Falls back to the session location when not set.',
    _default: '',
  },
};

export type RadiologyConfig = {
  radiologyConceptSetUuid: string;
  radiologyConceptClassUuid: string;
  radiologyOrderTypeUuid: string;
  pacsBaseUrl: string;
  pacsUsername: string;
  pacsPassword: string;
  scheduledStationAETitle: string;
  worklistWriterBaseUrl: string;
  renalFunctionTestConceptUuid: string;
  radiologyOrdersRequiringRenalFunctionCheck: {
    procedureConceptUuid: string;
    labResultValidityPeriodInDays: number;
  }[];
  radiologyAppointmentLocationUuid: string;
};
