import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { PatientRegistrationFormData } from './patient.registration.workspace';

export interface HealthIdAllergy {
  allergenUuid: string;
  allergenDisplay: string;
  allergenType: 'DRUG' | 'FOOD' | 'ENVIRONMENT';
  severity: string;
  reactions: Array<{ uuid: string; display: string }>;
}

export interface HealthIdCondition {
  conditionUuid: string;
  conditionDisplay: string;
  onsetDate?: string;
  clinicalStatus?: string;
}

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
    allergies?: HealthIdAllergy[];
    chronicDiseases?: HealthIdCondition[];
    bloodType?: string; // e.g. "A-", "O+", "B+"
    attributes?: any[];
    identifiers?: any[];
    nationality?: string;
  };
  message: string;
  success: boolean;
}

type PatientIdentifierSearchResult = {
  uuid: string;
  identifiers?: Array<{
    identifier: string;
    voided?: boolean;
    identifierType?: { uuid: string };
  }>;
};

export async function patientMrnIdentifierInUse(mrn: string, identifierTypeUuid: string): Promise<boolean> {
  const trimmedMrn = mrn?.trim();
  const trimmedTypeUuid = identifierTypeUuid?.trim();
  if (!trimmedMrn || !trimmedTypeUuid) {
    return false;
  }

  try {
    const url = `${restBaseUrl}/patient?identifier=${encodeURIComponent(
      trimmedMrn,
    )}&v=custom:(uuid,identifiers:(identifier,voided,identifierType:(uuid)))`;
    const response = await openmrsFetch<{ results?: PatientIdentifierSearchResult[] }>(url);
    const results = response?.data?.results ?? [];

    return results.some((patient) =>
      patient.identifiers?.some(
        (patientIdentifier) =>
          !patientIdentifier.voided &&
          patientIdentifier.identifier === trimmedMrn &&
          patientIdentifier.identifierType?.uuid === trimmedTypeUuid,
      ),
    );
  } catch (error) {
    // Don't silently pass on network errors: upstream should decide how to proceed.
    // eslint-disable-next-line no-console
    console.error('[MRN duplicate check] Failed:', error);
    throw error;
  }
}

export async function patientIdentifierTypeExists(identifierTypeUuid: string): Promise<boolean> {
  const trimmedUuid = identifierTypeUuid?.trim();
  if (!trimmedUuid) {
    return false;
  }
  try {
    const response = await openmrsFetch<{ uuid?: string }>(`${restBaseUrl}/patientidentifiertype/${trimmedUuid}`);
    return !!response?.data?.uuid;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[MRN identifier type check] Failed:', error);
    throw error;
  }
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

export function buildDisabilityTypeAttributeValue(data: {
  disabilityNone?: boolean;
  disabilityVisionLoss?: boolean;
  disabilityHearingLoss?: boolean;
  disabilityMobilityImpairment?: boolean;
  disabilityOther?: boolean;
  disabilityOtherSpecify?: string;
}): string | null {
  if (data.disabilityNone) {
    return 'none';
  }
  const segments: string[] = [];
  if (data.disabilityVisionLoss) {
    segments.push('vision_loss');
  }
  if (data.disabilityHearingLoss) {
    segments.push('hearing_loss');
  }
  if (data.disabilityMobilityImpairment) {
    segments.push('mobility_impairment');
  }
  if (data.disabilityOther) {
    const spec = (data.disabilityOtherSpecify ?? '').trim();
    if (spec.length > 0) {
      segments.push(`other:${spec}`);
    }
  }
  if (segments.length === 0) {
    return null;
  }
  return segments.join(';');
}

export const buildPatientRegistrationPayload = (
  formData: PatientRegistrationFormData,
  uuid: string,
  identifier: string,
  defaultIdentifierTypeUuid: string,
  locationUuid: string,
  disabilityTypeAttributeValue: string | null,
  disabilityStatusAttributeTypeUuid?: string,
  healthId?: string,
  healthIdIdentifierTypeUuid?: string,
  mrnIdentifierTypeUuid?: string,
  addresses?: any[],
  bloodType?: string,
  bloodTypeAttributeTypeUuid?: string,
  phone?: string,
  phoneAttributeTypeUuid?: string,
  email?: string,
  emailAttributeTypeUuid?: string,
  persistMrnIdentifier = false,
) => {
  const { formattedBirthDate, birthdateEstimated } = calculateBirthdate(formData);

  const genderCode = formData.gender === 'Male' ? 'M' : 'F';

  const attributes: Array<{ attributeType: string; value: string }> = [];
  if (
    disabilityTypeAttributeValue &&
    disabilityStatusAttributeTypeUuid &&
    disabilityStatusAttributeTypeUuid.trim() !== ''
  ) {
    attributes.push({
      attributeType: disabilityStatusAttributeTypeUuid,
      value: disabilityTypeAttributeValue,
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

  const trimmedMrn = (formData.mrnNumber ?? '').trim();
  if (persistMrnIdentifier && trimmedMrn && mrnIdentifierTypeUuid && mrnIdentifierTypeUuid.trim() !== '') {
    identifiers.push({
      identifier: trimmedMrn,
      identifierType: mrnIdentifierTypeUuid.trim(),
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

type SeverityConfig = { mild: string; moderate: string; severe: string };

function getSeverityUuid(severity: string | undefined, config: SeverityConfig): string {
  if (!severity) {
    return config.mild;
  }
  const key = severity.trim().toLowerCase();
  return config[key] ?? config.mild;
}

export async function saveAllergy(
  patientUuid: string,
  allergy: HealthIdAllergy,
  severityConfig: SeverityConfig,
): Promise<void> {
  const payload = {
    allergen: {
      allergenType: allergy.allergenType,
      codedAllergen: { uuid: allergy.allergenUuid },
    },
    severity: { uuid: getSeverityUuid(allergy.severity, severityConfig) },
    comment: '',
    reactions: allergy.reactions.map((r) => ({ reaction: { uuid: r.uuid } })),
  };
  await openmrsFetch(`${restBaseUrl}/patient/${patientUuid}/allergy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveCondition(patientUuid: string, condition: HealthIdCondition): Promise<void> {
  const payload = {
    resourceType: 'Condition',
    subject: { reference: `Patient/${patientUuid}` },
    code: { coding: [{ code: condition.conditionUuid, display: condition.conditionDisplay }] },
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: condition.clinicalStatus || 'active',
        },
      ],
    },
    ...(condition.onsetDate ? { onsetDateTime: `${condition.onsetDate}T00:00:00` } : {}),
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
