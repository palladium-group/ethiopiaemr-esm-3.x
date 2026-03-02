import type { Patient, PersonAddress } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

const birthdate = '2000-01-01T00:00:00.000+0000';
const age = dayjs().diff(birthdate, 'years');

// FHIR Patient used across apps and tests
export const mockPatient: fhir.Patient = {
  resourceType: 'Patient',
  id: '8673ee4f-e2ab-4077-ba55-4980f408773e',
  // some tests also use `uuid` directly
  uuid: '8673ee4f-e2ab-4077-ba55-4980f408773e' as any,
  extension: [
    {
      url: 'http://fhir-es.transcendinsights.com/stu3/StructureDefinition/resource-date-created',
      valueDateTime: '2017-01-18T09:42:40+00:00',
    },
  ],
  identifier: [
    {
      id: '1f0ad7a1-430f-4397-b571-59ea654a52db',
      use: 'secondary',
      system: 'Old Identification Number',
      value: '100732HE',
    },
    {
      id: '1f0ad7a1-430f-4397-b571-59ea654a52db',
      use: 'usual',
      system: 'OpenMRS ID',
      value: '100GEJ',
    },
  ],
  active: true,
  name: [
    {
      id: 'efdb246f-4142-4c12-a27a-9be60b9592e9',
      use: 'usual',
      family: 'Wilson',
      given: ['John'],
      text: 'Wilson, John',
    },
  ],
  gender: 'male',
  birthDate: '1972-04-04',
  deceasedBoolean: false,
  address: [
    {
      country: 'កម្ពុជា (Cambodia)',
    },
  ],
} as any;

// Variants used in some tests for formatting / edge cases
export const mockPatientWithLongName: fhir.Patient = {
  ...(mockPatient as fhir.Patient),
  name: [
    {
      id: 'efdb246f-4142-4c12-a27a-9be60b9592e9',
      use: 'usual',
      family: 'family name',
      given: ['Some very long given name'],
      text: 'family name, Some very long given name',
    },
  ],
} as any;

export const mockPatientWithoutFormattedName: fhir.Patient = {
  ...(mockPatient as fhir.Patient),
  name: [
    {
      id: 'efdb246f-4142-4c12-a27a-9be60b9592e9',
      use: 'usual',
      family: 'family name',
      given: ['given', 'middle'],
    },
  ],
} as any;

export const patientChartBasePath = `/patient/${mockPatient.id}/chart`;
