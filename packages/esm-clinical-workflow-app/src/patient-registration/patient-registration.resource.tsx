import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { PatientRegistrationFormData } from './patient.registration.workspace';

export const buildPatientRegistrationPayload = (
  formData: PatientRegistrationFormData,
  uuid: string,
  identifier: string,
  defaultIdentifierTypeUuid: string,
  locationUuid: string,
) => {
  let formattedBirthDate: string;
  let birthdateEstimated = false;

  if (formData.dateOfBirth) {
    formattedBirthDate = dayjs(formData.dateOfBirth).format('YYYY-M-D');
    birthdateEstimated = formData.isEstimatedDOB || false;
  } else if (
    formData.isEstimatedDOB &&
    (formData.ageYears !== undefined || formData.ageMonths !== undefined || formData.ageDays !== undefined)
  ) {
    // Calculate birthdate from age fields
    const currentDate = dayjs();
    let calculatedDate = currentDate;

    if (formData.ageYears !== undefined && formData.ageYears !== null) {
      calculatedDate = calculatedDate.subtract(formData.ageYears, 'year');
    }
    if (formData.ageMonths !== undefined && formData.ageMonths !== null) {
      calculatedDate = calculatedDate.subtract(formData.ageMonths, 'month');
    }
    if (formData.ageDays !== undefined && formData.ageDays !== null) {
      calculatedDate = calculatedDate.subtract(formData.ageDays, 'day');
    }

    formattedBirthDate = calculatedDate.format('YYYY-M-D');
    birthdateEstimated = true;
  } else if (formData.ageYears !== undefined || formData.ageMonths !== undefined || formData.ageDays !== undefined) {
    const currentDate = dayjs();
    let calculatedDate = currentDate;

    if (formData.ageYears !== undefined && formData.ageYears !== null) {
      calculatedDate = calculatedDate.subtract(formData.ageYears, 'year');
    }
    if (formData.ageMonths !== undefined && formData.ageMonths !== null) {
      calculatedDate = calculatedDate.subtract(formData.ageMonths, 'month');
    }
    if (formData.ageDays !== undefined && formData.ageDays !== null) {
      calculatedDate = calculatedDate.subtract(formData.ageDays, 'day');
    }

    formattedBirthDate = calculatedDate.format('YYYY-M-D');
    birthdateEstimated = false;
  } else {
    // Fallback - should not happen due to validation, but provide a default
    formattedBirthDate = dayjs().format('YYYY-M-D');
    birthdateEstimated = false;
  }

  // Map gender to single character (M/F)
  const genderCode = formData.gender === 'Male' ? 'M' : 'F';

  return {
    uuid: uuid,
    person: {
      uuid: uuid,
      names: [
        {
          preferred: true,
          givenName: formData.firstName,
          middleName: formData.middleName,
          familyName: formData.lastName,
        },
      ],
      gender: genderCode,
      birthdate: formattedBirthDate,
      birthdateEstimated: birthdateEstimated,
      attributes: [],
      addresses: [{}],
      dead: false,
    },
    identifiers: [
      {
        identifier: identifier,
        identifierType: defaultIdentifierTypeUuid,
        location: locationUuid,
        preferred: true,
      },
    ],
  };
};

export const registerNewPatient = (payload) => {
  const url = `${restBaseUrl}/patient`;

  return openmrsFetch<fhir.Patient>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};
export const generateIdentifier = (identifierSourceUuid: string) => {
  const url = `${restBaseUrl}/idgen/identifiersource/${identifierSourceUuid}/identifier`;
  return openmrsFetch<fhir.Identifier>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {},
  });
};
