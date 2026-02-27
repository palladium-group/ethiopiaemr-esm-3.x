import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { PatientRegistrationFormData } from './patient.registration.workspace';

export interface HealthIdPatient {
  fhir: {
    uuid?: string;
    person: {
      names: Array<{ givenName: string; middleName: string; familyName: string }>;
      gender: string;
      birthdate: string;
    };
    healthId: string;
  };
  message: string;
  success: boolean;
}

export async function fetchPatientByHealthId(healthId: string, lookupUrl: string): Promise<HealthIdPatient> {
  const url = new URL(lookupUrl, window.location.origin);
  url.searchParams.set('healthId', healthId);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health ID lookup failed with status ${response.status}`);
  }
  return response.json();
}

export const calculateDOBFromAgeFields = (
  ageYears?: number | null,
  ageMonths?: number | null,
  ageDays?: number | null,
  ageHours?: number | null,
  ageMinutes?: number | null,
): Date | null => {
  const hasAgeFields =
    (ageYears !== undefined && ageYears !== null && ageYears >= 0) ||
    (ageMonths !== undefined && ageMonths !== null && ageMonths >= 0) ||
    (ageDays !== undefined && ageDays !== null && ageDays >= 0) ||
    (ageHours !== undefined && ageHours !== null && ageHours >= 0) ||
    (ageMinutes !== undefined && ageMinutes !== null && ageMinutes >= 0);

  if (!hasAgeFields) {
    return null;
  }

  const currentDate = dayjs();
  let calculatedDate = currentDate;

  if (ageYears !== undefined && ageYears !== null) {
    calculatedDate = calculatedDate.subtract(ageYears, 'year');
  }
  if (ageMonths !== undefined && ageMonths !== null) {
    calculatedDate = calculatedDate.subtract(ageMonths, 'month');
  }
  if (ageDays !== undefined && ageDays !== null) {
    calculatedDate = calculatedDate.subtract(ageDays, 'day');
  }
  if (ageHours !== undefined && ageHours !== null) {
    calculatedDate = calculatedDate.subtract(ageHours, 'hour');
  }
  if (ageMinutes !== undefined && ageMinutes !== null) {
    calculatedDate = calculatedDate.subtract(ageMinutes, 'minute');
  }

  return calculatedDate.toDate();
};

const calculateBirthdate = (
  formData: PatientRegistrationFormData,
): { formattedBirthDate: string; birthdateEstimated: boolean } => {
  let formattedBirthDate: string;
  let birthdateEstimated = false;

  if (formData.dateOfBirth) {
    const hasTimeComponent =
      (formData.ageDays !== undefined && formData.ageDays !== null) ||
      (formData.ageHours !== undefined && formData.ageHours !== null) ||
      (formData.ageMinutes !== undefined && formData.ageMinutes !== null);
    if (hasTimeComponent) {
      formattedBirthDate = dayjs(formData.dateOfBirth).format('YYYY-M-D HH:mm:ss');
    } else {
      formattedBirthDate = dayjs(formData.dateOfBirth).format('YYYY-M-D');
    }
    birthdateEstimated = formData.isEstimatedDOB || false;
  } else if (
    formData.isEstimatedDOB &&
    (formData.ageYears !== undefined ||
      formData.ageMonths !== undefined ||
      formData.ageDays !== undefined ||
      formData.ageHours !== undefined ||
      formData.ageMinutes !== undefined)
  ) {
    const calculatedDOB = calculateDOBFromAgeFields(
      formData.ageYears,
      formData.ageMonths,
      formData.ageDays,
      formData.ageHours,
      formData.ageMinutes,
    );
    if (calculatedDOB) {
      const hasTimeComponent =
        (formData.ageDays !== undefined && formData.ageDays !== null) ||
        (formData.ageHours !== undefined && formData.ageHours !== null) ||
        (formData.ageMinutes !== undefined && formData.ageMinutes !== null);
      if (hasTimeComponent) {
        formattedBirthDate = dayjs(calculatedDOB).format('YYYY-M-D HH:mm:ss');
      } else {
        formattedBirthDate = dayjs(calculatedDOB).format('YYYY-M-D');
      }
      birthdateEstimated = true;
    } else {
      formattedBirthDate = dayjs().format('YYYY-M-D');
      birthdateEstimated = false;
    }
  } else if (
    formData.ageYears !== undefined ||
    formData.ageMonths !== undefined ||
    formData.ageDays !== undefined ||
    formData.ageHours !== undefined ||
    formData.ageMinutes !== undefined
  ) {
    const calculatedDOB = calculateDOBFromAgeFields(
      formData.ageYears,
      formData.ageMonths,
      formData.ageDays,
      formData.ageHours,
      formData.ageMinutes,
    );
    if (calculatedDOB) {
      const hasTimeComponent =
        (formData.ageDays !== undefined && formData.ageDays !== null) ||
        (formData.ageHours !== undefined && formData.ageHours !== null) ||
        (formData.ageMinutes !== undefined && formData.ageMinutes !== null);
      if (hasTimeComponent) {
        formattedBirthDate = dayjs(calculatedDOB).format('YYYY-M-D HH:mm:ss');
      } else {
        formattedBirthDate = dayjs(calculatedDOB).format('YYYY-M-D');
      }
      birthdateEstimated = false;
    } else {
      formattedBirthDate = dayjs().format('YYYY-M-D');
      birthdateEstimated = false;
    }
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
  hasDisability?: boolean,
  disabilityStatusAttributeTypeUuid?: string,
  healthId?: string,
  healthIdIdentifierTypeUuid?: string,
) => {
  const { formattedBirthDate, birthdateEstimated } = calculateBirthdate(formData);

  const genderCode = formData.gender === 'Male' ? 'M' : 'F';

  const attributes: Array<{ attributeType: string; value: string }> = [];
  if (isMedicoLegalCase === true && medicoLegalCasesAttributeTypeUuid) {
    attributes.push({
      attributeType: medicoLegalCasesAttributeTypeUuid,
      value: 'true',
    });
  }
  if (hasDisability === true && disabilityStatusAttributeTypeUuid) {
    attributes.push({
      attributeType: disabilityStatusAttributeTypeUuid,
      value: 'true',
    });
  }

  const identifiers: Array<{ identifier: string; identifierType: string; location: string; preferred: boolean }> = [
    {
      identifier: identifier,
      identifierType: defaultIdentifierTypeUuid,
      location: locationUuid,
      preferred: true,
    },
  ];

  if (healthId && healthIdIdentifierTypeUuid) {
    identifiers.push({
      identifier: healthId,
      identifierType: healthIdIdentifierTypeUuid,
      location: locationUuid,
      preferred: false,
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
    identifiers,
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
