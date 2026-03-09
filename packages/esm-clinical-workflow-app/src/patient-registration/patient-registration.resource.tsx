import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { PatientRegistrationFormData } from './patient.registration.workspace';
import { mapAllergenToCategory, getAllergenCodingSystem } from './allergen-category-mapper';

export interface HealthIdPatient {
  fhir: {
    uuid?: string;
    email?: string;
    phone?: string;
    person: {
      names: Array<{ givenName: string; middleName?: string; familyName: string }>;
      gender: string;
      addresses?: any[];
      birthdate: string;
    };
    healthId: string;
    allergies?: string[]; // e.g. ["EGGS", "PEANUTS"]
    chronicDiseases?: string[]; // e.g. ["ARTHRITIS", "DIABETES"]
    bloodType?: string; // e.g. "A-", "O+", "B+"
    attributes?: any[];
    identifiers?: any[];
    nationality?: string;
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
  addresses?: any[],
  bloodType?: string,
  bloodTypeAttributeTypeUuid?: string,
  phone?: string,
  phoneAttributeTypeUuid?: string,
  email?: string,
  emailAttributeTypeUuid?: string,
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

  // Add Health ID extra fields as person attributes
  // Only add if both value and UUID are present and UUID is not empty
  if (bloodType && bloodTypeAttributeTypeUuid && bloodTypeAttributeTypeUuid.trim() !== '') {
    attributes.push({
      attributeType: bloodTypeAttributeTypeUuid,
      value: bloodType,
    });
  }
  if (phone && phoneAttributeTypeUuid && phoneAttributeTypeUuid.trim() !== '') {
    attributes.push({
      attributeType: phoneAttributeTypeUuid,
      value: phone,
    });
  }
  if (email && emailAttributeTypeUuid && emailAttributeTypeUuid.trim() !== '') {
    attributes.push({
      attributeType: emailAttributeTypeUuid,
      value: email,
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
      addresses: addresses && addresses.length > 0 ? addresses : [{}],
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

/**
 * Creates a FHIR AllergyIntolerance resource for a patient.
 * Used to persist allergies from Health ID lookup to the patient chart.
 *
 * @param patientUuid - The UUID of the patient
 * @param allergyDisplay - The display name of the allergy (e.g., "EGGS", "PEANUTS")
 */
export async function createAllergyIntolerance(patientUuid: string, allergyDisplay: string): Promise<void> {
  // Validate input
  if (!allergyDisplay || allergyDisplay.trim().length === 0) {
    console.warn('[AllergyIntolerance] Skipping empty allergen name');
    return;
  }

  const normalizedAllergen = allergyDisplay.trim();
  const category = mapAllergenToCategory(normalizedAllergen);

  const payload = {
    resourceType: 'AllergyIntolerance',
    patient: { reference: `Patient/${patientUuid}` },
    // Category is required by OpenMRS - array of string codes
    category: [category],
    // Code requires proper coding structure
    code: {
      coding: [
        {
          system: getAllergenCodingSystem(),
          code: normalizedAllergen.toUpperCase().replace(/\s+/g, '_'),
          display: normalizedAllergen,
        },
      ],
      text: normalizedAllergen,
    },
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: 'active',
        },
      ],
    },
  };

  try {
    await openmrsFetch('/ws/fhir2/R4/AllergyIntolerance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line no-console
    console.info(`[AllergyIntolerance] Successfully created allergy: ${normalizedAllergen} (category: ${category})`);
  } catch (error) {
    console.error(`[AllergyIntolerance] Failed to create allergy: ${normalizedAllergen}`, error);
    // Include detailed error information for debugging
    if (error?.response) {
      try {
        const errorData = await error.response.json();
        console.error('[AllergyIntolerance] Response error:', errorData);
      } catch {
        const errorText = await error.response.text().catch(() => 'Unable to read response');
        console.error('[AllergyIntolerance] Response error:', errorText);
      }
    }
    throw error;
  }
}

/**
 * Creates a FHIR Condition resource for a patient.
 * Used to persist chronic diseases from Health ID lookup to the patient chart.
 *
 * @param patientUuid - The UUID of the patient
 * @param conditionDisplay - The display name of the condition (e.g., "ARTHRITIS", "DIABETES")
 */
export async function createCondition(patientUuid: string, conditionDisplay: string): Promise<void> {
  const payload = {
    resourceType: 'Condition',
    subject: { reference: `Patient/${patientUuid}` },
    code: { text: conditionDisplay },
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
        },
      ],
    },
  };

  await openmrsFetch('/ws/fhir2/R4/Condition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/fhir+json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Sets a person attribute for blood type.
 * Used to persist blood type from Health ID lookup to patient demographics.
 *
 * @param personUuid - The UUID of the person
 * @param bloodType - The blood type value (e.g., "A+", "O-", "B+")
 * @param bloodTypeAttributeTypeUuid - The UUID of the blood type person attribute type from config
 */
export async function setBloodTypeAttribute(
  personUuid: string,
  bloodType: string,
  bloodTypeAttributeTypeUuid: string,
): Promise<void> {
  if (!bloodTypeAttributeTypeUuid) {
    console.warn('[Health ID] Blood type attribute type UUID not configured, skipping blood type persistence');
    return;
  }

  await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributeType: bloodTypeAttributeTypeUuid,
      value: bloodType,
    }),
  });
}

/**
 * Sets a person attribute for phone number.
 * Used to persist phone number from Health ID lookup to patient demographics.
 *
 * @param personUuid - The UUID of the person
 * @param phoneNumber - The phone number value
 * @param phoneAttributeTypeUuid - The UUID of the phone person attribute type from config
 */
export async function setPhoneAttribute(
  personUuid: string,
  phoneNumber: string,
  phoneAttributeTypeUuid: string,
): Promise<void> {
  if (!phoneAttributeTypeUuid) {
    console.warn('[Health ID] Phone attribute type UUID not configured, skipping phone number persistence');
    return;
  }

  await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributeType: phoneAttributeTypeUuid,
      value: phoneNumber,
    }),
  });
}
