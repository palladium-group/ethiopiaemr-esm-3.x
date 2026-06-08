import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

const SYNC_STATUS_URL = '/ws/rest/v1/ethiopiaemretl/sync/status';
const SYNC_URL = '/ws/rest/v1/ethiopiaemretl/sync';
const RECREATE_URL = '/ws/rest/v1/ethiopiaemretl/recreate';

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
  const { data, error, isLoading, mutate } = useSWR<{ data: EtlSyncStatusResponse }, Error>(
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

export async function triggerSync(): Promise<EtlActionResponse> {
  // ETL operations can run for several minutes; abort after 10 minutes if no response.
  const response = await openmrsFetch<EtlActionResponse>(SYNC_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  return response.data;
}

export async function recreateTables(): Promise<EtlActionResponse> {
  const response = await openmrsFetch<EtlActionResponse>(RECREATE_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  return response.data;
}
