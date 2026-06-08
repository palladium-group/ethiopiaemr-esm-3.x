import useSWR from 'swr';
import { openmrsFetch, type FetchResponse } from '@openmrs/esm-framework';

const SYNC_STATUS_URL = '/ws/rest/v1/ethiopiaemretl/sync/status';
const SYNC_URL = '/ws/rest/v1/ethiopiaemretl/sync';
const RECREATE_URL = '/ws/rest/v1/ethiopiaemretl/recreate';

// ETL operations can run for several minutes; abort after 10 minutes if no response.
export const ETL_OPERATION_TIMEOUT_MS = 10 * 60 * 1000;

export interface EtlTableStatus {
  syncStatus: string;
  lastSync: string | null;
  durationMs: number | null;
  recordsProcessed: number | null;
}

export interface EtlSyncStatusResponse {
  status: string;
  tables: Record<string, EtlTableStatus>;
}

export interface EtlActionResponse {
  status: string;
  message?: string;
  durationMs?: number;
}

export function useEtlSyncStatus() {
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<EtlSyncStatusResponse>, Error>(
    SYNC_STATUS_URL,
    openmrsFetch,
  );
  return {
    syncStatus: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
}

function withTimeout(externalSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(ETL_OPERATION_TIMEOUT_MS);
  return externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
}

export async function triggerSync(signal?: AbortSignal): Promise<EtlActionResponse> {
  const response = await openmrsFetch<EtlActionResponse>(SYNC_URL, {
    method: 'POST',
    signal: withTimeout(signal),
  });
  return response.data;
}

export async function recreateTables(signal?: AbortSignal): Promise<EtlActionResponse> {
  const response = await openmrsFetch<EtlActionResponse>(RECREATE_URL, {
    method: 'POST',
    signal: withTimeout(signal),
  });
  return response.data;
}

/**
 * Extracts a user-meaningful error message from an exception thrown by
 * openmrsFetch. Falls back to the generic Error.message if the server did
 * not return a structured body.
 */
export function extractErrorMessage(e: unknown): string {
  const err = e as { responseBody?: { message?: string; error?: { message?: string } }; message?: string };
  return err?.responseBody?.error?.message ?? err?.responseBody?.message ?? err?.message ?? 'Unknown error';
}
