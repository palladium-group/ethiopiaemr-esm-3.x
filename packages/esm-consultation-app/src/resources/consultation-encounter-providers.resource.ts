import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { CONSULTATION_ENCOUNTER_ROLE_UUIDS } from '../constants';
import { CONSULTATION_ENCOUNTER_REPRESENTATION } from './consultation.resource';

export type ConsultationEncounterProviderSyncMode = 'create' | 'respond';

type ExistingEncounterProvider = {
  uuid: string;
  providerUuid: string;
  encounterRoleUuid?: string;
};

export type EncounterProviderSyncAction =
  | { type: 'create'; providerUuid: string; encounterRoleUuid: string }
  | { type: 'update'; encounterProviderUuid: string; encounterRoleUuid: string };

export function planConsultationEncounterProviderSync({
  existingProviders,
  currentProviderUuid,
  mode,
  requestingProviderUuid,
  roleUuids = CONSULTATION_ENCOUNTER_ROLE_UUIDS,
}: {
  existingProviders: Array<ExistingEncounterProvider>;
  currentProviderUuid: string;
  mode: ConsultationEncounterProviderSyncMode;
  /** Known requester when responding; used if the form save dropped the original encounter provider. */
  requestingProviderUuid?: string;
  roleUuids?: typeof CONSULTATION_ENCOUNTER_ROLE_UUIDS;
}): Array<EncounterProviderSyncAction> {
  const actions: Array<EncounterProviderSyncAction> = [];
  const requestingRoleUuid = roleUuids.requestingEncounterRoleUuid;
  const consultedRoleUuid = roleUuids.consultedEncounterRoleUuid;

  const findByProviderUuid = (providerUuid: string) =>
    existingProviders.find((row) => row.providerUuid === providerUuid);

  const upsertRole = (providerUuid: string, encounterRoleUuid: string) => {
    const existing = findByProviderUuid(providerUuid);
    if (!existing) {
      actions.push({ type: 'create', providerUuid, encounterRoleUuid });
      return;
    }

    if (existing.encounterRoleUuid !== encounterRoleUuid) {
      actions.push({ type: 'update', encounterProviderUuid: existing.uuid, encounterRoleUuid });
    }
  };

  if (mode === 'create') {
    upsertRole(currentProviderUuid, requestingRoleUuid);
    return actions;
  }

  const requesterProviderUuid =
    requestingProviderUuid ??
    existingProviders.find((row) => row.encounterRoleUuid === requestingRoleUuid)?.providerUuid ??
    existingProviders.find((row) => row.providerUuid !== currentProviderUuid)?.providerUuid;

  if (requesterProviderUuid) {
    upsertRole(requesterProviderUuid, requestingRoleUuid);
  }

  if (currentProviderUuid === requesterProviderUuid) {
    return actions;
  }

  const existingResponder = findByProviderUuid(currentProviderUuid);
  if (!existingResponder) {
    actions.push({ type: 'create', providerUuid: currentProviderUuid, encounterRoleUuid: consultedRoleUuid });
  } else if (existingResponder.encounterRoleUuid !== consultedRoleUuid) {
    actions.push({
      type: 'update',
      encounterProviderUuid: existingResponder.uuid,
      encounterRoleUuid: consultedRoleUuid,
    });
  }

  return actions;
}

async function applyEncounterProviderSyncAction(
  encounterUuid: string,
  action: EncounterProviderSyncAction,
): Promise<void> {
  if (action.type === 'create') {
    await openmrsFetch(`${restBaseUrl}/encounterprovider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        encounter: encounterUuid,
        provider: action.providerUuid,
        encounterRole: action.encounterRoleUuid,
      },
    });
    return;
  }

  await openmrsFetch(`${restBaseUrl}/encounterprovider/${action.encounterProviderUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      encounterRole: action.encounterRoleUuid,
    },
  });
}

/**
 * Tags encounter providers with consultation-specific roles after form save.
 * Keeps the consultation form free of visible (or hidden) physician picker fields.
 */
export async function syncConsultationEncounterProviders({
  encounterUuid,
  currentProviderUuid,
  mode,
  requestingProviderUuid,
}: {
  encounterUuid: string;
  currentProviderUuid: string;
  mode: ConsultationEncounterProviderSyncMode;
  requestingProviderUuid?: string;
}): Promise<void> {
  const { data: encounter } = await openmrsFetch<{
    encounterProviders?: Array<{
      uuid?: string;
      provider?: { uuid?: string };
      encounterRole?: { uuid?: string };
    }>;
  }>(`${restBaseUrl}/encounter/${encounterUuid}?v=${CONSULTATION_ENCOUNTER_REPRESENTATION}`);

  const existingProviders: Array<ExistingEncounterProvider> = (encounter?.encounterProviders ?? [])
    .filter((row) => row.uuid && row.provider?.uuid)
    .map((row) => ({
      uuid: row.uuid!,
      providerUuid: row.provider!.uuid!,
      encounterRoleUuid: row.encounterRole?.uuid,
    }));

  const actions = planConsultationEncounterProviderSync({
    existingProviders,
    currentProviderUuid,
    mode,
    requestingProviderUuid,
  });

  for (const action of actions) {
    await applyEncounterProviderSyncAction(encounterUuid, action);
  }
}
