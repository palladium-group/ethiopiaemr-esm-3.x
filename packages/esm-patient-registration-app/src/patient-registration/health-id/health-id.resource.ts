export interface HealthIdName {
  givenName: string;
  middleName?: string;
  familyName: string;
}

export interface HealthIdAddress {
  countyDistrict?: string;
  stateProvince?: string;
  cityVillage?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  country?: string;
  postalCode?: string;
  district?: string;
  state?: string;
  city?: string;
}

export interface HealthIdPatient {
  fhir: {
    uuid?: string;
    email?: string;
    phone?: string;
    person: {
      names: Array<HealthIdName>;
      gender: string;
      addresses?: Array<HealthIdAddress>;
      birthdate: string;
    };
    healthId: string;
    allergies?: Array<any>;
    chronicDiseases?: Array<any>;
    bloodType?: string;
    attributes?: Array<any>;
    identifiers?: Array<any>;
    nationality?: string;
  };
  message: string;
  success: boolean;
  patientNotFound?: boolean;
  serviceUnavailable?: boolean;
}

export async function fetchPatientByHealthId(healthId: string, lookupUrl: string): Promise<HealthIdPatient> {
  const trimmedId = healthId?.trim();
  if (!trimmedId) {
    throw new Error('Health ID is required');
  }

  const url = new URL(lookupUrl, window.location.origin);
  url.searchParams.set('healthId', trimmedId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    const errorBody = await response.json().catch(() => null);
    return (
      errorBody || {
        success: false,
        patientNotFound: true,
        message: `Patient with Health ID "${trimmedId}" was not found`,
        fhir: null as any,
      }
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || `Health ID lookup failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Checks whether a patient record or form values already has a Health ID identifier attached.
 */
export function isHealthIdIdentifierAttached(
  identifiers?: Record<string, any> | Array<any> | null,
  healthIdIdentifierTypeUuid?: string,
): boolean {
  if (!identifiers) {
    return false;
  }

  const targetUuid = healthIdIdentifierTypeUuid?.trim().toLowerCase();
  const list = Array.isArray(identifiers) ? identifiers : Object.values(identifiers);

  return list.some((item) => {
    if (!item) {
      return false;
    }

    const val = item.identifierValue || item.identifier || item.value;
    if (!val || typeof val !== 'string' || !val.trim() || val === 'auto-generated') {
      return false;
    }

    const typeUuid = (
      item.identifierTypeUuid ||
      item.identifierType?.uuid ||
      item.type?.coding?.[0]?.code
    )?.toLowerCase();

    const typeName = (item.identifierName || item.identifierType?.name || item.type?.text)?.toLowerCase();

    const matchesUuid = targetUuid && typeUuid === targetUuid;
    const matchesName =
      typeName &&
      (typeName.includes('health id') ||
        typeName.includes('health') ||
        typeName.includes('mpi') ||
        typeName.includes('empi'));

    return Boolean(matchesUuid || matchesName);
  });
}
