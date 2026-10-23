import useSWR from 'swr';
import { openmrsFetch, type FetchResponse } from '@openmrs/esm-framework';
import type {
  CatchmentListResponse,
  FacilityDirectoryResponse,
  ReferralDashboardResponse,
  ReferralDetailResponse,
  ReferralDirection,
  ReferralDraftPayload,
  ReferralListResponse,
  ReferralOptionsResponse,
} from './types';

export const REFERRAL_BASE = '/ws/rest/v1/ethiopiaemrreferral/referral';
export const CATCHMENT_BASE = '/ws/rest/v1/ethiopiaemrreferral/catchment';

function bodyError<T extends { status: string; message?: string }>(body: T | null | undefined): Error | null {
  if (!body || body.status === 'success') {
    return null;
  }
  return new Error(body.message ?? 'Request failed');
}

export function buildReferralListUrl(params: {
  direction?: ReferralDirection;
  status?: string;
  q?: string;
  offset: number;
  limit: number;
}) {
  const search = new URLSearchParams();
  if (params.direction) {
    search.set('direction', params.direction);
  }
  if (params.status && params.status !== 'ALL') {
    search.set('status', params.status);
  }
  if (params.q?.trim()) {
    search.set('q', params.q.trim());
  }
  search.set('offset', String(params.offset));
  search.set('limit', String(params.limit));
  return `${REFERRAL_BASE}?${search.toString()}`;
}

export function useReferrals(params: {
  direction?: ReferralDirection;
  status?: string;
  q?: string;
  offset: number;
  limit: number;
}) {
  const url = buildReferralListUrl(params);
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ReferralListResponse>, Error>(url, openmrsFetch, {
    keepPreviousData: true,
    refreshInterval: 30_000,
  });
  const body = data?.data;
  return {
    data: body?.status === 'success' ? body : null,
    error: error ?? bodyError(body),
    isLoading: isLoading && !body,
    mutate,
  };
}

export function useReferral(uuid?: string) {
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ReferralDetailResponse>, Error>(
    uuid ? `${REFERRAL_BASE}/${uuid}` : null,
    openmrsFetch,
  );
  const body = data?.data;
  return {
    data: body?.status === 'success' ? body : null,
    error: error ?? bodyError(body),
    isLoading,
    mutate,
  };
}

export function useReferralOptions() {
  const { data, error, isLoading } = useSWR<FetchResponse<ReferralOptionsResponse>, Error>(
    `${REFERRAL_BASE}/options`,
    openmrsFetch,
    { revalidateOnFocus: false },
  );
  const body = data?.data;
  return {
    options: body?.status === 'success' ? body : null,
    error: error ?? bodyError(body),
    isLoading,
  };
}

export function useReferralDashboard() {
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ReferralDashboardResponse>, Error>(
    `${REFERRAL_BASE}/dashboard`,
    openmrsFetch,
    { refreshInterval: 60_000 },
  );
  const body = data?.data;
  return {
    dashboard: body?.status === 'success' ? body : null,
    error: error ?? bodyError(body),
    isLoading,
    mutate,
  };
}

export function useCatchment(params: { service?: string; includeInactive?: boolean } = {}) {
  const search = new URLSearchParams();
  if (params.service?.trim()) {
    search.set('service', params.service.trim());
  }
  if (params.includeInactive) {
    search.set('includeInactive', 'true');
  }
  const qs = search.toString();
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<CatchmentListResponse>, Error>(
    `${CATCHMENT_BASE}${qs ? `?${qs}` : ''}`,
    openmrsFetch,
  );
  const body = data?.data;
  return {
    entries: body?.status === 'success' ? body.rows : [],
    error: error ?? bodyError(body),
    isLoading,
    mutate,
  };
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await openmrsFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.data as unknown as { status?: string; message?: string };
  if (data?.status && data.status !== 'success') {
    throw new Error(data.message ?? 'Request failed');
  }
  return res.data;
}

export function saveReferral(payload: ReferralDraftPayload) {
  return postJson<ReferralDetailResponse>(REFERRAL_BASE, payload);
}

export function submitReferral(uuid: string, comment?: string) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/submit`, { comment });
}

export function sendReferral(
  uuid: string,
  body: { receivingFacilityCode: string; requestedService?: string; comment?: string },
) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/send`, body);
}

export function cancelReferral(uuid: string, comment?: string) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/cancel`, { comment });
}

export function acceptReferral(
  uuid: string,
  body: {
    comment?: string;
    conditionAtHandover?: string;
    handoverSummary?: string;
    receivingDepartment?: string;
    arrivalDate?: string;
  },
) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/accept`, body);
}

export function rejectReferral(uuid: string, body: { reasonCode: string; comment?: string }) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/reject`, body);
}

export interface FeedbackBody {
  comment?: string;
  feedbackDiagnosis?: string;
  treatmentSummary?: string;
  medicationPlan?: string;
  followUpInstruction?: string;
  feedbackTreatmentGiven?: string;
}

export function referBack(uuid: string, body: FeedbackBody) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/refer-back`, body);
}

export function sendFeedback(uuid: string, body: FeedbackBody) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/feedback`, body);
}

export function reReferReferral(uuid: string, body: { onwardFacilityCode: string; comment?: string }) {
  return postJson<ReferralDetailResponse>(`${REFERRAL_BASE}/${uuid}/re-refer`, body);
}

export function useFacilityDirectory(query: string | null) {
  const term = query?.trim() ?? '';
  const url =
    query === null ? null : `${CATCHMENT_BASE}/directory${term.length >= 2 ? `?q=${encodeURIComponent(term)}` : ''}`;
  const { data, error, isLoading } = useSWR<FetchResponse<FacilityDirectoryResponse>, Error>(url, openmrsFetch);
  const body = data?.data;
  return {
    facilities: body?.status === 'success' ? body.rows ?? [] : [],
    configured: body?.configured !== false,
    warning: body?.warning,
    error: error ?? bodyError(body),
    isLoading: Boolean(url) && isLoading,
  };
}
export function saveCatchment(body: {
  uuid?: string;
  facilityCode?: string;
  facilityName?: string;
  tier?: string;
  services?: Array<string> | string;
}) {
  return postJson<{ status: string; catchment: unknown }>(CATCHMENT_BASE, body);
}

export function deactivateCatchment(uuid: string, reason: string) {
  return postJson(`${CATCHMENT_BASE}/${uuid}/deactivate`, { reason });
}

export function reactivateCatchment(uuid: string) {
  return postJson(`${CATCHMENT_BASE}/${uuid}/reactivate`);
}

export interface ReferralSyncResponse {
  status: string;
  configured?: boolean;
  fetched?: number;
  applied?: number;
  already?: number;
  waiting?: number;
  rejected?: number;
  warning?: string;
}

/** Ask this server to pull its queue. Failure here leaves the lists on what is already stored. */
export function syncReferralQueue() {
  return postJson<ReferralSyncResponse>(`${REFERRAL_BASE}/sync`);
}
