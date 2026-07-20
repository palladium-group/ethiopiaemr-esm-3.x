import { useMemo } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

/**
 * Marker (array) key prefix for the SWR entry that holds prescription sync outcome, so other
 * components can revalidate it by key match (e.g. after a resend).
 */
export const FAILED_PRESCRIPTION_SYNC_SWR_KEY = 'failed-prescription-sync';

/**
 * Poll interval (ms) for the prescription sync outcome. The eAPTS result is reported out-of-band by
 * the OpenFn callback with no client event, so we poll to reflect it without a manual page refresh.
 */
const FAILED_PRESCRIPTION_SYNC_REFRESH_INTERVAL_MS = 20_000;

/**
 * Only SUCCESS/FAILED — the backend omits an encounter from `results` entirely when no terminal
 * outcome has been reported yet, rather than asserting a "pending" state it can't actually verify.
 */
type OutcomeStatus = 'SUCCESS' | 'FAILED';

interface PrescriptionOutboxOutcomeDTO {
  encounterUuid: string;
  outcomeStatus: OutcomeStatus;
  reason?: string | null;
  lastUpdated?: string | null;
}

interface PrescriptionOutboxOutcomeResponse {
  results: Array<PrescriptionOutboxOutcomeDTO>;
}

export interface FailedPrescriptionSync {
  reason: string | null;
  lastUpdated: string | null;
}

async function fetchSyncOutcome(encounterUuids: Array<string>): Promise<Array<PrescriptionOutboxOutcomeDTO>> {
  const url = `${restBaseUrl}/ethiopiaemrcustommodule/prescriptionOutbox/status?encounters=${encounterUuids.join(',')}`;
  const { data } = await openmrsFetch<PrescriptionOutboxOutcomeResponse>(url);
  return data?.results ?? [];
}

export interface UseFailedPrescriptionSyncResult {
  failedSyncByEncounter: Map<string, FailedPrescriptionSync>;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<Array<PrescriptionOutboxOutcomeDTO>>;
}

/**
 * Fetches the downstream OpenFn/eAPTS outcome for the given encounters' prescription syncs and
 * returns a map of only the encounters whose latest sync attempt was reported FAILED, keyed by
 * encounter UUID. Encounters that are still awaiting a reported outcome, succeeded, or have no sync
 * history at all are omitted (the backend never reports a "pending" guess).
 *
 * All encounters are fetched within a single SWR entry (deduplicated, sorted key) and polled so the
 * UI reflects the OpenFn callback's out-of-band update without a page refresh.
 */
export function useFailedPrescriptionSync(encounterUuids: Array<string>): UseFailedPrescriptionSyncResult {
  const sortedEncounterUuids = useMemo(
    () => Array.from(new Set(encounterUuids.filter(Boolean))).sort(),
    [encounterUuids],
  );

  const swrKey = sortedEncounterUuids.length ? [FAILED_PRESCRIPTION_SYNC_SWR_KEY, ...sortedEncounterUuids] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Array<PrescriptionOutboxOutcomeDTO>, Error>(
    swrKey,
    ([, ...uuids]: Array<string>) => fetchSyncOutcome(uuids),
    {
      refreshInterval: FAILED_PRESCRIPTION_SYNC_REFRESH_INTERVAL_MS,
      revalidateOnFocus: true,
    },
  );

  const failedSyncByEncounter = useMemo(() => {
    const map = new Map<string, FailedPrescriptionSync>();
    data?.forEach((result) => {
      if (result?.encounterUuid && result.outcomeStatus === 'FAILED') {
        map.set(result.encounterUuid, { reason: result.reason ?? null, lastUpdated: result.lastUpdated ?? null });
      }
    });
    return map;
  }, [data]);

  return { failedSyncByEncounter, isLoading, isValidating, error, mutate };
}
