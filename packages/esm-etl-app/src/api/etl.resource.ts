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

export function useEtlSyncStatus(refreshInterval = 30_000) {
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<EtlSyncStatusResponse>, Error>(
    SYNC_STATUS_URL,
    openmrsFetch,
    { refreshInterval },
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
  if (!externalSignal) {
    return timeoutSignal;
  }
  // AbortSignal.any is available in Chrome 116+, Firefox 124+, Safari 17.4+.
  // Fall back to a manual composite controller for older targets.
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  [externalSignal, timeoutSignal].forEach((s) => {
    if (s.aborted) {
      abort();
    } else {
      s.addEventListener('abort', abort, { once: true });
    }
  });
  return controller.signal;
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
  if (typeof e !== 'object' || e === null) {
    return 'Unknown error';
  }
  const obj = e as Record<string, unknown>;
  const body = obj['responseBody'];
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    const errMsg = (b['error'] as Record<string, unknown> | undefined)?.['message'];
    if (typeof errMsg === 'string') {
      return errMsg;
    }
    if (typeof b['message'] === 'string') {
      return b['message'];
    }
  }
  if (typeof obj['message'] === 'string') {
    return obj['message'];
  }
  return 'Unknown error';
}
