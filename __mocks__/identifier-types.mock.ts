import type {
  PatientIdentifierType,
  PatientIdentifierValue,
} from '../packages/esm-patient-registration-app/src/patient-registration/patient-registration.types';

// Identifier types used by id-field tests
export const mockIdentifierTypes: PatientIdentifierType[] = [
  {
    uuid: 'openmrs-id-uuid',
    name: 'OpenMRS ID',
    fieldName: 'openMrsId',
    format: '^[0-9]{5,6}$',
    formatDescription: 'Format: 5-6 digits',
    required: true,
    isPrimary: true,
    uniquenessBehavior: 'UNIQUE',
    identifierSources: [
      {
        uuid: 'source-1-uuid',
        name: 'Auto-generated',
        autoGenerationOption: {
          automaticGenerationEnabled: true,
          manualEntryEnabled: false,
        },
      },
    ],
  },
  {
    uuid: 'id-card-uuid',
    name: 'ID Card',
    fieldName: 'idCard',
    format: '',
    required: false,
    isPrimary: false,
    uniquenessBehavior: 'NON_UNIQUE',
    identifierSources: [
      {
        uuid: 'source-2-uuid',
        name: 'Manual Entry',
        autoGenerationOption: {
          automaticGenerationEnabled: false,
          manualEntryEnabled: true,
        },
      },
    ],
  },
];

// Initial identifier values used in some patient-registration tests
export const mockOpenmrsId: Record<string, PatientIdentifierValue> = {
  openMrsId: {
    identifierTypeUuid: 'openmrs-id-uuid',
    identifierName: 'OpenMRS ID',
    identifierUuid: '1f0ad7a1-430f-4397-b571-59ea654a52db',
    identifierValue: '100GEJ',
    initialValue: '100GEJ',
    selectedSource: mockIdentifierTypes[0].identifierSources[0],
    autoGeneration: true,
    preferred: true,
    required: true,
  },
};
