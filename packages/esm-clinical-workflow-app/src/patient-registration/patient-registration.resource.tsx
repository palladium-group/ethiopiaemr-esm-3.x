import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { PatientRegistrationFormData } from './patient.registration.workspace';

const calculateBirthdate = (
  formData: PatientRegistrationFormData,
): { formattedBirthDate: string; birthdateEstimated: boolean } => {
  let formattedBirthDate: string;
  let birthdateEstimated = false;

  if (formData.dateOfBirth) {
    formattedBirthDate = dayjs(formData.dateOfBirth).format('YYYY-M-D');
    birthdateEstimated = formData.isEstimatedDOB || false;
  } else if (
    formData.isEstimatedDOB &&
    (formData.ageYears !== undefined || formData.ageMonths !== undefined || formData.ageDays !== undefined)
  ) {
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
    formattedBirthDate = dayjs().format('YYYY-M-D');
    birthdateEstimated = false;
  }

  return { formattedBirthDate, birthdateEstimated };
};

export const buildPatientRegistrationPayload = (
  formData: PatientRegistrationFormData,
  uuid: string,
  identifier: string,
  defaultIdentifierTypeUuid: string,
  locationUuid: string,
  isMedicoLegalCase?: boolean,
  medicoLegalCasesAttributeTypeUuid?: string,
  triageFormName?: string,
) => {
  const { formattedBirthDate, birthdateEstimated } = calculateBirthdate(formData);

  const genderCode = formData.gender === 'Male' ? 'M' : 'F';

  const attributes: Array<{ attributeType: string; value: string }> = [];
  if (isMedicoLegalCase === true && medicoLegalCasesAttributeTypeUuid && triageFormName === 'Emergency Triage Form') {
    attributes.push({
      attributeType: medicoLegalCasesAttributeTypeUuid,
      value: 'true',
    });
  }

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
      attributes: attributes,
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
