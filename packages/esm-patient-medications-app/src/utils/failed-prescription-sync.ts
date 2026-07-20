import { useMemo } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

/**
 * Marker (array) key prefix for the SWR entry that holds prescription sync status, so other
 * components can revalidate it by key match (e.g. after a resend).
 */
export const FAILED_PRESCRIPTION_SYNC_SWR_KEY = 'failed-prescription-sync';

/**
 * Poll interval (ms) for prescription sync status. The eAPTS sync outcome is reported
 * out-of-band by the OpenFn callback with no client event, so we poll to reflect it without a
 * manual page refresh (mirrors `DTP_RETURN_REFRESH_INTERVAL_MS`).
 */
const FAILED_PRESCRIPTION_SYNC_REFRESH_INTERVAL_MS = 10_000;

type SyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

interface PrescriptionOutboxStatusDTO {
  encounterUuid: string;
  syncStatus: SyncStatus;
  reason?: string | null;
  lastUpdated?: string | null;
}

interface PrescriptionOutboxStatusResponse {
  results: Array<PrescriptionOutboxStatusDTO>;
}

export interface FailedPrescriptionSync {
  reason: string | null;
  lastUpdated: string | null;
}

async function fetchSyncStatus(encounterUuids: Array<string>): Promise<Array<PrescriptionOutboxStatusDTO>> {
  const url = `${restBaseUrl}/ethiopiaemrcustommodule/prescriptionOutbox/status?encounters=${encounterUuids.join(',')}`;
  const { data } = await openmrsFetch<PrescriptionOutboxStatusResponse>(url);
  return data?.results ?? [];
}

export interface UseFailedPrescriptionSyncResult {
  failedSyncByEncounter: Map<string, FailedPrescriptionSync>;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<Array<PrescriptionOutboxStatusDTO>>;
}

/**
 * Fetches prescription eAPTS sync status for the given encounters and returns a map of only the
 * encounters whose latest sync attempt failed, keyed by encounter UUID. Encounters that are
 * still pending, have succeeded, or have no sync history at all are omitted.
 *
 * All encounters are fetched within a single SWR entry (deduplicated, sorted key) and polled so
 * the UI reflects the OpenFn callback's out-of-band update without a page refresh.
 */
export function useFailedPrescriptionSync(encounterUuids: Array<string>): UseFailedPrescriptionSyncResult {
  const sortedEncounterUuids = useMemo(
    () => Array.from(new Set(encounterUuids.filter(Boolean))).sort(),
    [encounterUuids],
  );

  const swrKey = sortedEncounterUuids.length ? [FAILED_PRESCRIPTION_SYNC_SWR_KEY, ...sortedEncounterUuids] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Array<PrescriptionOutboxStatusDTO>, Error>(
    swrKey,
    ([, ...uuids]: Array<string>) => fetchSyncStatus(uuids),
    {
      refreshInterval: FAILED_PRESCRIPTION_SYNC_REFRESH_INTERVAL_MS,
      revalidateOnFocus: true,
    },
  );

  const failedSyncByEncounter = useMemo(() => {
    const map = new Map<string, FailedPrescriptionSync>();
    data?.forEach((result) => {
      if (result?.encounterUuid && result.syncStatus === 'FAILED') {
        map.set(result.encounterUuid, { reason: result.reason ?? null, lastUpdated: result.lastUpdated ?? null });
      }
    });
    return map;
  }, [data]);

  return { failedSyncByEncounter, isLoading, isValidating, error, mutate };
}
