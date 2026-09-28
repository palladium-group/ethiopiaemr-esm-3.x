import {
  openmrsFetch,
  restBaseUrl,
  type Encounter,
  type FetchResponse,
  type OpenmrsResource,
  type Visit,
} from '@openmrs/esm-framework';
import useSWR from 'swr';

export function visitHasEncounterType(visit: Visit | null | undefined, encounterTypeUuid: string): boolean {
  if (!visit?.encounters?.length || !encounterTypeUuid) {
    return false;
  }

  return visit.encounters.some((encounter) => encounter.encounterType?.uuid === encounterTypeUuid);
}

export function createNurseDischargeConfirmationEncounter(params: {
  patientUuid: string;
  visitUuid: string;
  locationUuid: string;
  providerUuid: string;
  encounterRoleUuid: string;
  encounterTypeUuid: string;
  confirmationConceptUuid: string;
  yesConceptUuid: string;
}) {
  return openmrsFetch<Encounter>(`${restBaseUrl}/encounter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      patient: params.patientUuid,
      encounterType: params.encounterTypeUuid,
      location: params.locationUuid,
      visit: params.visitUuid,
      encounterProviders: [
        {
          provider: params.providerUuid,
          encounterRole: params.encounterRoleUuid,
        },
      ],
      obs: [
        {
          concept: params.confirmationConceptUuid,
          value: params.yesConceptUuid,
        },
      ],
    },
  });
}

const visitEncountersRep =
  'custom:(uuid,attributes:(uuid,attributeType:(uuid),value),' +
  'encounters:(uuid,encounterType:(uuid),encounterDatetime,obs:(uuid,concept:(uuid),value:(uuid))))';

export function useVisitWithEncounters(visitUuid: string | null | undefined) {
  const url = visitUuid ? `${restBaseUrl}/visit/${visitUuid}?v=${visitEncountersRep}` : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Visit>>(url, openmrsFetch);

  return {
    visit: data?.data,
    error,
    isLoading,
    mutate,
  };
}

export type EmrDischargeConfiguration = {
  exitFromInpatientEncounterType?: OpenmrsResource;
  clinicianEncounterRole?: OpenmrsResource;
  bedAssignmentEncounterType?: OpenmrsResource;
};
