import { CONSULTATION_ENCOUNTER_ROLE_UUIDS } from '../constants';
import { planConsultationEncounterProviderSync } from './consultation-encounter-providers.resource';

describe('planConsultationEncounterProviderSync', () => {
  const roleUuids = CONSULTATION_ENCOUNTER_ROLE_UUIDS;

  it('assigns the consulting physician role when creating a request', () => {
    const actions = planConsultationEncounterProviderSync({
      existingProviders: [
        {
          uuid: 'ep-1',
          providerUuid: 'requester-provider-uuid',
          encounterRoleUuid: 'a0b03050-c99b-11e0-9572-0800200c9a66',
        },
      ],
      currentProviderUuid: 'requester-provider-uuid',
      mode: 'create',
      roleUuids,
    });

    expect(actions).toEqual([
      {
        type: 'update',
        encounterProviderUuid: 'ep-1',
        encounterRoleUuid: roleUuids.requestingEncounterRoleUuid,
      },
    ]);
  });

  it('creates a consulting physician row when the session provider is not yet on the encounter', () => {
    const actions = planConsultationEncounterProviderSync({
      existingProviders: [],
      currentProviderUuid: 'requester-provider-uuid',
      mode: 'create',
      roleUuids,
    });

    expect(actions).toEqual([
      {
        type: 'create',
        providerUuid: 'requester-provider-uuid',
        encounterRoleUuid: roleUuids.requestingEncounterRoleUuid,
      },
    ]);
  });

  it('preserves the requester and tags the responder when completing a consultation', () => {
    const actions = planConsultationEncounterProviderSync({
      existingProviders: [
        {
          uuid: 'ep-requester',
          providerUuid: 'requester-provider-uuid',
          encounterRoleUuid: roleUuids.requestingEncounterRoleUuid,
        },
        {
          uuid: 'ep-consulted',
          providerUuid: 'consulted-provider-uuid',
          encounterRoleUuid: 'a0b03050-c99b-11e0-9572-0800200c9a66',
        },
      ],
      currentProviderUuid: 'consulted-provider-uuid',
      mode: 'respond',
      roleUuids,
    });

    expect(actions).toEqual([
      {
        type: 'update',
        encounterProviderUuid: 'ep-consulted',
        encounterRoleUuid: roleUuids.consultedEncounterRoleUuid,
      },
    ]);
  });

  it('does not replace the requester role when the same clinician responds', () => {
    const actions = planConsultationEncounterProviderSync({
      existingProviders: [
        {
          uuid: 'ep-requester',
          providerUuid: 'requester-provider-uuid',
          encounterRoleUuid: roleUuids.requestingEncounterRoleUuid,
        },
      ],
      currentProviderUuid: 'requester-provider-uuid',
      mode: 'respond',
      roleUuids,
    });

    expect(actions).toEqual([]);
  });

  it('restores the requester when the form save left only the responding provider', () => {
    const actions = planConsultationEncounterProviderSync({
      existingProviders: [
        {
          uuid: 'ep-consulted',
          providerUuid: 'consulted-provider-uuid',
        },
      ],
      currentProviderUuid: 'consulted-provider-uuid',
      requestingProviderUuid: 'requester-provider-uuid',
      mode: 'respond',
      roleUuids,
    });

    expect(actions).toEqual([
      {
        type: 'create',
        providerUuid: 'requester-provider-uuid',
        encounterRoleUuid: roleUuids.requestingEncounterRoleUuid,
      },
      {
        type: 'update',
        encounterProviderUuid: 'ep-consulted',
        encounterRoleUuid: roleUuids.consultedEncounterRoleUuid,
      },
    ]);
  });

  it('infers the requester from the first non-responding provider when roles are missing', () => {
    const actions = planConsultationEncounterProviderSync({
      existingProviders: [
        {
          uuid: 'ep-requester',
          providerUuid: 'requester-provider-uuid',
        },
        {
          uuid: 'ep-consulted',
          providerUuid: 'consulted-provider-uuid',
        },
      ],
      currentProviderUuid: 'consulted-provider-uuid',
      mode: 'respond',
      roleUuids,
    });

    expect(actions).toEqual([
      {
        type: 'update',
        encounterProviderUuid: 'ep-requester',
        encounterRoleUuid: roleUuids.requestingEncounterRoleUuid,
      },
      {
        type: 'update',
        encounterProviderUuid: 'ep-consulted',
        encounterRoleUuid: roleUuids.consultedEncounterRoleUuid,
      },
    ]);
  });
});
