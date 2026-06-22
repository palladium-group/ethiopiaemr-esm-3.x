import { useMemo } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';

/**
 * Marker (array) key prefix for the SWR entry that holds DTP pharmacy return obs.
 * Exposed so other components (e.g. the resend workspace) can revalidate it by key match.
 */
export const DTP_RETURN_OBS_SWR_KEY = 'dtp-return-obs';

/**
 * Poll interval (ms) for DTP return obs. Encounters can be mutated out-of-band (e.g. the Dagu
 * mediator or a Postman request) with no client event, so we poll to reflect those changes
 * without a manual page refresh.
 */
const DTP_RETURN_REFRESH_INTERVAL_MS = 10_000;

const encounterObsRepresentation =
  'custom:(uuid,obs:(uuid,obsDatetime,value,concept:(uuid),' + 'groupMembers:(uuid,obsDatetime,value,concept:(uuid))))';

type ObsValue = string | number | boolean | { uuid?: string; display?: string } | null;

interface EncounterObs {
  uuid?: string;
  obsDatetime?: string;
  value?: ObsValue;
  concept?: { uuid?: string };
  groupMembers?: Array<EncounterObs>;
}

export interface EncounterObsResponse {
  uuid: string;
  obs?: Array<EncounterObs>;
}

export interface DtpReturnReason {
  obsUuid?: string;
  obsDatetime: number;
  category?: string;
  reason?: string;
  note?: string;
}

export interface DtpReturnInfo {
  /** Return reasons, newest first. */
  reasons: Array<DtpReturnReason>;
  latestReturnDatetime: number | null;
  latestResponseDatetime: number | null;
  /**
   * True when at least one return group exists and it has not been answered by a same-or-newer
   * DTP response obs (Option A). A newer return group re-opens the returned state.
   */
  isReturned: boolean;
}

const EMPTY_DTP_RETURN_INFO: DtpReturnInfo = {
  reasons: [],
  latestReturnDatetime: null,
  latestResponseDatetime: null,
  isReturned: false,
};

function getObsTextValue(value: ObsValue): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return value.display?.trim() || undefined;
}

function getObsDatetime(obs: EncounterObs): number {
  const time = obs.obsDatetime ? new Date(obs.obsDatetime).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

type DtpReturnConceptUuids = ConfigObject['dtpPharmacyReturn'];

/**
 * Parses the DTP pharmacy return state from a single encounter's obs tree.
 *
 * Return groups are top-level obs whose concept matches `groupConceptUuid`; the category, reason and
 * note are text obs nested as group members. The physician's resend writes a top-level DTP response
 * obs (`responseConceptUuid`); when the latest response is same-or-newer than the latest return
 * group, the prescription is considered handled and the returned UI is hidden.
 */
export function parseDtpReturnInfo(
  encounter: EncounterObsResponse | undefined,
  concepts: DtpReturnConceptUuids,
): DtpReturnInfo {
  if (!encounter?.obs?.length) {
    return EMPTY_DTP_RETURN_INFO;
  }

  const reasons: Array<DtpReturnReason> = [];
  let latestResponseDatetime: number | null = null;

  encounter.obs.forEach((obs) => {
    const conceptUuid = obs.concept?.uuid;
    if (!conceptUuid) {
      return;
    }

    if (conceptUuid === concepts.groupConceptUuid) {
      const reason: DtpReturnReason = { obsUuid: obs.uuid, obsDatetime: getObsDatetime(obs) };
      obs.groupMembers?.forEach((member) => {
        switch (member.concept?.uuid) {
          case concepts.categoryConceptUuid:
            reason.category = getObsTextValue(member.value);
            break;
          case concepts.reasonConceptUuid:
            reason.reason = getObsTextValue(member.value);
            break;
          case concepts.noteConceptUuid:
            reason.note = getObsTextValue(member.value);
            break;
          default:
            break;
        }
      });
      reasons.push(reason);
      return;
    }

    if (conceptUuid === concepts.responseConceptUuid) {
      const datetime = getObsDatetime(obs);
      latestResponseDatetime = latestResponseDatetime == null ? datetime : Math.max(latestResponseDatetime, datetime);
    }
  });

  if (!reasons.length) {
    return { ...EMPTY_DTP_RETURN_INFO, latestResponseDatetime };
  }

  reasons.sort((a, b) => b.obsDatetime - a.obsDatetime);
  const latestReturnDatetime = reasons[0].obsDatetime;
  const isHandled = latestResponseDatetime != null && latestResponseDatetime >= latestReturnDatetime;

  return {
    reasons,
    latestReturnDatetime,
    latestResponseDatetime,
    isReturned: !isHandled,
  };
}

async function fetchEncounterObs(encounterUuids: Array<string>): Promise<Array<EncounterObsResponse>> {
  const responses = await Promise.all(
    encounterUuids.map(async (uuid) => {
      const { data } = await openmrsFetch<EncounterObsResponse>(
        `${restBaseUrl}/encounter/${uuid}?v=${encounterObsRepresentation}`,
      );
      return data;
    }),
  );
  return responses.filter(Boolean);
}

export interface UseDtpReturnObsResult {
  dtpReturnByEncounter: Map<string, DtpReturnInfo>;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<Array<EncounterObsResponse>>;
}

/**
 * Fetches and parses DTP pharmacy return obs for the given encounters, keyed by encounter UUID.
 *
 * All encounters are fetched within a single SWR entry (deduplicated, sorted key) and polled so the
 * UI reflects out-of-band encounter updates without a page refresh.
 */
export function useDtpReturnObs(encounterUuids: Array<string>): UseDtpReturnObsResult {
  const { dtpPharmacyReturn } = useConfig<ConfigObject>();

  const sortedEncounterUuids = useMemo(
    () => Array.from(new Set(encounterUuids.filter(Boolean))).sort(),
    [encounterUuids],
  );

  const swrKey = sortedEncounterUuids.length ? [DTP_RETURN_OBS_SWR_KEY, ...sortedEncounterUuids] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Array<EncounterObsResponse>, Error>(
    swrKey,
    ([, ...uuids]: Array<string>) => fetchEncounterObs(uuids),
    {
      refreshInterval: DTP_RETURN_REFRESH_INTERVAL_MS,
      revalidateOnFocus: true,
    },
  );

  const dtpReturnByEncounter = useMemo(() => {
    const map = new Map<string, DtpReturnInfo>();
    data?.forEach((encounter) => {
      if (encounter?.uuid) {
        map.set(encounter.uuid, parseDtpReturnInfo(encounter, dtpPharmacyReturn));
      }
    });
    return map;
  }, [data, dtpPharmacyReturn]);

  return { dtpReturnByEncounter, isLoading, isValidating, error, mutate };
}
