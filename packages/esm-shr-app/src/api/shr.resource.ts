import useSWR from 'swr';
import { openmrsFetch, type FetchResponse } from '@openmrs/esm-framework';

const BASE = '/ws/rest/v1/ethiopiaemrshr/outbox';

/** Mirrors ShrOutboxStatus in the SHR module. */
export type ShrOutboxStatus = 'PENDING' | 'SUBMITTED' | 'SENT' | 'FAILED' | 'DEAD_LETTER';

export interface ShrOutboxRow {
  outboxId: number;
  resourceType: string | null;
  resourceUuid: string | null;
  operation: string | null;
  status: ShrOutboxStatus | null;
  retryCount: number;
  workOrderId: string | null;
  dateCreated: string | null;
  dateChanged: string | null;
  lastError: string | null;
  /** The server decides what may be retried; the UI must not re-derive the rule. */
  retryable: boolean;
}

export interface ShrOutboxListResponse {
  status: string;
  message?: string;
  rows: Array<ShrOutboxRow>;
  /**
   * Row count per status for the whole outbox, *not* scoped to the `status` filter of the request —
   * that is what lets the breakdown chips and the "Send queued records" action stay meaningful while
   * a filter is applied. A status with no rows may be reported as 0 or omitted entirely, so callers
   * must distinguish "known to be zero" from "absent"; see `pendingCount` below.
   */
  counts: Record<string, number>;
  /** Rows matching the current filter — what the pager counts. */
  total: number;
  /** Rows in the whole outbox, regardless of filter. */
  grandTotal: number;
  offset: number;
  limit: number;
}

export function buildListUrl(status: string, offset: number, limit: number): string {
  return `${BASE}/list?status=${encodeURIComponent(status)}&offset=${offset}&limit=${limit}`;
}

export function useShrOutbox(status: string, offset: number, limit: number, refreshInterval = 30_000) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FetchResponse<ShrOutboxListResponse>, Error>(
    buildListUrl(status, offset, limit),
    openmrsFetch,
    // keepPreviousData holds the last page on screen while a filter or page change loads, so the
    // overview strip and chips do not flicker out on every key change.
    { refreshInterval, keepPreviousData: true },
  );

  // The controller answers 200 with {"status":"error"} for a refused privilege or a bad filter,
  // rather than an HTTP error code — so a body-level error has to be surfaced explicitly or the
  // page would render an empty table and look merely uneventful.
  const body = data?.data ?? null;
  const bodyError = body && body.status !== 'success' ? new Error(body.message ?? 'Request failed') : null;

  return {
    outbox: body && body.status === 'success' ? body : null,
    // SWR flags isLoading on every key change even while keepPreviousData serves the old page;
    // only "loading with nothing to show" should blank the UI.
    isLoading: isLoading && !body,
    isValidating,
    error: error ?? bodyError,
    mutate,
  };
}

/**
 * Rows the server reports as PENDING, or undefined when it did not report that status at all.
 *
 * Undefined is not zero: a count that never arrived is not evidence that the queue is empty, and the
 * overview shows the two differently.
 */
export function pendingCount(counts?: Record<string, number>): number | undefined {
  return counts?.['PENDING'];
}

function errorName(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) {
    return null;
  }
  const name = (e as { name?: unknown }).name;
  return typeof name === 'string' ? name : null;
}

/** True for the abort the component itself raises on unmount — a non-event, not a failure to report. */
export function isAbortError(e: unknown): boolean {
  return errorName(e) === 'AbortError';
}

/**
 * True when a request ran past its deadline. `AbortSignal.timeout` aborts with a TimeoutError
 * rather than an AbortError, so this needs its own test — otherwise a timeout surfaces as the
 * browser's untranslated "signal timed out".
 */
export function isTimeoutError(e: unknown): boolean {
  return errorName(e) === 'TimeoutError';
}

/**
 * Extracts a user-meaningful error message from an exception thrown by openmrsFetch, or null if the
 * server did not return a structured body and the error carries no message. Callers supply a
 * translated fallback for the null case so all user-facing strings stay in the i18n layer.
 */
export function extractErrorMessage(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) {
    return null;
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
  return null;
}
