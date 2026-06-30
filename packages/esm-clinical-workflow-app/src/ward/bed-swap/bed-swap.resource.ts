import { openmrsFetch, type Encounter, restBaseUrl } from '@openmrs/esm-framework';

export interface EncounterContextParams {
  encounterTypeUuid: string;
  locationUuid: string;
  providerUuid: string;
  encounterRoleUuid: string;
}

export interface CreateEncounterParams extends EncounterContextParams {
  patientUuid: string;
  visitUuid: string;
}

export interface MovePatientToBedParams extends EncounterContextParams {
  patientUuid: string;
  visitUuid: string;
  sourceBedId: number;
  targetBedId: number;
}

export interface ExchangePatientBedsParams extends EncounterContextParams {
  patientAUuid: string;
  patientBUuid: string;
  visitAUuid: string;
  visitBUuid: string;
  bedAId: number;
  bedBId: number;
}

async function createBedAssignmentEncounter(params: CreateEncounterParams): Promise<Encounter> {
  const response = await openmrsFetch<Encounter>(`${restBaseUrl}/encounter`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
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
    },
  });

  if (!response.ok || !response.data?.uuid) {
    throw new Error('Failed to create bed assignment encounter');
  }

  return response.data;
}

export function assignPatientToBed(bedId: number, patientUuid: string, encounterUuid: string) {
  return openmrsFetch(`${restBaseUrl}/beds/${bedId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: {
      patientUuid,
      encounterUuid,
    },
  });
}

export function removePatientFromBed(bedId: number, patientUuid: string) {
  return openmrsFetch(`${restBaseUrl}/beds/${bedId}?patientUuid=${patientUuid}`, {
    method: 'DELETE',
  });
}

export async function movePatientToBed(params: MovePatientToBedParams) {
  let encounterUuid: string | undefined;
  let removedFromSource = false;

  try {
    const encounter = await createBedAssignmentEncounter({
      patientUuid: params.patientUuid,
      visitUuid: params.visitUuid,
      encounterTypeUuid: params.encounterTypeUuid,
      locationUuid: params.locationUuid,
      providerUuid: params.providerUuid,
      encounterRoleUuid: params.encounterRoleUuid,
    });
    encounterUuid = encounter.uuid;

    const removeResponse = await removePatientFromBed(params.sourceBedId, params.patientUuid);
    if (!removeResponse.ok) {
      throw new Error('Failed to remove patient from their current bed');
    }
    removedFromSource = true;

    const assignResponse = await assignPatientToBed(params.targetBedId, params.patientUuid, encounterUuid);
    if (!assignResponse.ok) {
      throw new Error('Failed to assign patient to the selected bed');
    }

    return { ok: true as const };
  } catch (error) {
    if (removedFromSource && encounterUuid) {
      try {
        await assignPatientToBed(params.sourceBedId, params.patientUuid, encounterUuid);
      } catch (rollbackError) {
        console.error('[bed-swap] Rollback failed after move error', rollbackError);
      }
    }
    throw error;
  }
}

export async function exchangePatientBeds(params: ExchangePatientBedsParams) {
  let encounterAUuid: string | undefined;
  let encounterBUuid: string | undefined;
  let removedAFromBed = false;
  let removedBFromBed = false;
  let assignedAToBedB = false;

  const encounterBase = {
    encounterTypeUuid: params.encounterTypeUuid,
    locationUuid: params.locationUuid,
    providerUuid: params.providerUuid,
    encounterRoleUuid: params.encounterRoleUuid,
  };

  try {
    const encounterA = await createBedAssignmentEncounter({
      ...encounterBase,
      patientUuid: params.patientAUuid,
      visitUuid: params.visitAUuid,
    });
    encounterAUuid = encounterA.uuid;

    const encounterB = await createBedAssignmentEncounter({
      ...encounterBase,
      patientUuid: params.patientBUuid,
      visitUuid: params.visitBUuid,
    });
    encounterBUuid = encounterB.uuid;

    const removeAResponse = await removePatientFromBed(params.bedAId, params.patientAUuid);
    if (!removeAResponse.ok) {
      throw new Error('Failed to remove the first patient from their bed');
    }
    removedAFromBed = true;

    const removeBResponse = await removePatientFromBed(params.bedBId, params.patientBUuid);
    if (!removeBResponse.ok) {
      throw new Error('Failed to remove the second patient from their bed');
    }
    removedBFromBed = true;

    const assignAResponse = await assignPatientToBed(params.bedBId, params.patientAUuid, encounterAUuid);
    if (!assignAResponse.ok) {
      throw new Error('Failed to assign the first patient to the new bed');
    }
    assignedAToBedB = true;

    const assignBResponse = await assignPatientToBed(params.bedAId, params.patientBUuid, encounterBUuid);
    if (!assignBResponse.ok) {
      throw new Error('Failed to assign the second patient to the new bed');
    }

    return { ok: true as const };
  } catch (error) {
    try {
      if (assignedAToBedB && encounterAUuid) {
        await removePatientFromBed(params.bedBId, params.patientAUuid);
      }
      if (removedBFromBed && encounterBUuid) {
        await assignPatientToBed(params.bedBId, params.patientBUuid, encounterBUuid);
      }
      if (removedAFromBed && encounterAUuid) {
        await assignPatientToBed(params.bedAId, params.patientAUuid, encounterAUuid);
      }
    } catch (rollbackError) {
      console.error('[bed-swap] Rollback failed after exchange error', rollbackError);
    }

    throw error;
  }
}
