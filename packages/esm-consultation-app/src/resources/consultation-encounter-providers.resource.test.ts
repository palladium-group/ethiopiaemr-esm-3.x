import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { CONSULTATION_ENCOUNTER_ROLE_UUIDS } from '../constants';
import {
  planConsultationEncounterProviderSync,
  syncConsultationEncounterProviders,
} from './consultation-encounter-providers.resource';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;

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

describe('syncConsultationEncounterProviders', () => {
  const roleUuids = CONSULTATION_ENCOUNTER_ROLE_UUIDS;

  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  it('creates a provider row via the encounter subresource endpoint (not a top-level resource)', async () => {
    mockedOpenmrsFetch
      .mockResolvedValueOnce({ data: { encounterProviders: [] } } as never)
      .mockResolvedValueOnce({ data: {} } as never);

    await syncConsultationEncounterProviders({
      encounterUuid: 'encounter-uuid-1',
      currentProviderUuid: 'requester-provider-uuid',
      mode: 'create',
    });

    const createCall = mockedOpenmrsFetch.mock.calls[1];
    expect(createCall[0]).toBe(`${restBaseUrl}/encounter/encounter-uuid-1/encounterprovider`);
    expect(createCall[0]).not.toBe(`${restBaseUrl}/encounterprovider`);
    expect(createCall[1]).toMatchObject({
      method: 'POST',
      body: {
        provider: 'requester-provider-uuid',
        encounterRole: roleUuids.requestingEncounterRoleUuid,
      },
    });
    expect(createCall[1]?.body).not.toHaveProperty('encounter');
  });

  it('updates an existing provider role via the encounter subresource endpoint', async () => {
    mockedOpenmrsFetch
      .mockResolvedValueOnce({
        data: {
          encounterProviders: [
            {
              uuid: 'ep-1',
              provider: { uuid: 'requester-provider-uuid' },
              encounterRole: { uuid: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({ data: {} } as never);

    await syncConsultationEncounterProviders({
      encounterUuid: 'encounter-uuid-1',
      currentProviderUuid: 'requester-provider-uuid',
      mode: 'create',
    });

    const updateCall = mockedOpenmrsFetch.mock.calls[1];
    expect(updateCall[0]).toBe(`${restBaseUrl}/encounter/encounter-uuid-1/encounterprovider/ep-1`);
    expect(updateCall[1]).toMatchObject({
      method: 'POST',
      body: { encounterRole: roleUuids.requestingEncounterRoleUuid },
    });
  });

  it('tags the responder as the consulted physician via the subresource endpoint', async () => {
    mockedOpenmrsFetch
      .mockResolvedValueOnce({
        data: {
          encounterProviders: [
            {
              uuid: 'ep-requester',
              provider: { uuid: 'requester-provider-uuid' },
              encounterRole: { uuid: roleUuids.requestingEncounterRoleUuid },
            },
            {
              uuid: 'ep-consulted',
              provider: { uuid: 'consulted-provider-uuid' },
              encounterRole: { uuid: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({ data: {} } as never);

    await syncConsultationEncounterProviders({
      encounterUuid: 'encounter-uuid-1',
      currentProviderUuid: 'consulted-provider-uuid',
      mode: 'respond',
      requestingProviderUuid: 'requester-provider-uuid',
    });

    const updateCall = mockedOpenmrsFetch.mock.calls[1];
    expect(updateCall[0]).toBe(`${restBaseUrl}/encounter/encounter-uuid-1/encounterprovider/ep-consulted`);
    expect(updateCall[1]).toMatchObject({
      method: 'POST',
      body: { encounterRole: roleUuids.consultedEncounterRoleUuid },
    });
  });
});
