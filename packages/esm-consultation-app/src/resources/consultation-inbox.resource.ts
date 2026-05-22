import { openmrsFetch, restBaseUrl, type Encounter } from '@openmrs/esm-framework';
import type { ConsultationConceptUuids } from '../config-schema';
import type { ConsultationThread } from '../types/consultation.types';
import {
  CONSULTATION_ENCOUNTER_REPRESENTATION,
  filterPendingConsultations,
  mapEncountersToConsultations,
} from './consultation.resource';

type FhirCoding = {
  system?: string;
  code?: string;
};

type FhirEncounterResource = {
  resourceType: 'Encounter';
  id: string;
  type?: Array<{ coding?: Array<FhirCoding> }>;
};

type FhirBundle = {
  resourceType: 'Bundle';
  entry?: Array<{ resource?: FhirEncounterResource }>;
};

const INBOX_FETCH_LIMIT = 100;

export function getConsultationsInboxFhirUrl(locationUuid: string): string {
  const params = new URLSearchParams({
    location: locationUuid,
    _count: String(INBOX_FETCH_LIMIT),
    _sort: '-date',
  });

  return `/ws/fhir2/R4/Encounter?${params.toString()}`;
}

function isMatchingConsultationEncounterType(
  fhirEncounter: FhirEncounterResource,
  consultationEncounterTypeUuid: string,
): boolean {
  return (
    fhirEncounter.type?.some((type) => type.coding?.some((coding) => coding.code === consultationEncounterTypeUuid)) ??
    false
  );
}

async function fetchEncounterByUuid(encounterUuid: string): Promise<Encounter | null> {
  const response = await openmrsFetch<Encounter>(
    `${restBaseUrl}/encounter/${encounterUuid}?v=${CONSULTATION_ENCOUNTER_REPRESENTATION}`,
  );

  return response?.data ?? null;
}

export async function fetchConsultationsInbox(
  locationUuid: string,
  consultationEncounterTypeUuid: string,
  conceptUuids: ConsultationConceptUuids,
): Promise<Array<ConsultationThread>> {
  const fhirResponse = await openmrsFetch<FhirBundle>(getConsultationsInboxFhirUrl(locationUuid));
  const encounterUuids =
    fhirResponse?.data?.entry
      ?.map((entry) => entry.resource)
      .filter((resource): resource is FhirEncounterResource => resource?.resourceType === 'Encounter')
      .filter((resource) => isMatchingConsultationEncounterType(resource, consultationEncounterTypeUuid))
      .map((resource) => resource.id) ?? [];

  if (!encounterUuids.length) {
    return [];
  }

  const encounters = (
    await Promise.all(encounterUuids.map((encounterUuid) => fetchEncounterByUuid(encounterUuid)))
  ).filter((encounter): encounter is Encounter => Boolean(encounter));

  const consultations = mapEncountersToConsultations(encounters, conceptUuids).filter(
    (consultation) => consultation.consultedDepartment.uuid === locationUuid,
  );

  return filterPendingConsultations(consultations);
}
