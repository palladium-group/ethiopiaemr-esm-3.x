import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, type FetchResponse } from '@openmrs/esm-framework';
import { parseSummary, type ShrSummary } from './shr-summary';

const BASE = '/ws/rest/v1/shrclient';

/** Must match ShrClientConstants.PRIVILEGE_READ_SHR in ethiopiaemr-module-shr-client. */
export const READ_SHR_PRIVILEGE = 'Read Shared Health Record';

/** The record types a request can name, as the module accepts them. */
export const REQUESTABLE_TYPES = ['Condition', 'AllergyIntolerance', 'MedicationRequest', 'Encounter'] as const;

export type RequestableType = (typeof REQUESTABLE_TYPES)[number];

export const MAX_ACCESS_DAYS = 365;

/** Why the SHR or the module refused, as the code in an OperationOutcome's details.text. */
export interface ShrRefusal {
  code: string;
  status: number | null;
}

export interface PendingRequest {
  id: string;
  authoredOn: string | null;
  expires: string | null;
  resourceTypes: Array<string>;
}

/**
 * Whether the SHR is switched on at this facility, from the module's status endpoint.
 *
 * Off while loading and on any error, including a module too old to have the endpoint and a user
 * without the privilege: the dashboard must never appear for a request every read would refuse.
 */
export function useShrEnabled() {
  const { data, error, isLoading } = useSWRImmutable<FetchResponse<{ enabled?: unknown }>, Error>(
    `${BASE}/status`,
    openmrsFetch,
    { shouldRetryOnError: false },
  );
  return { isEnabled: !error && data?.data?.enabled === true, isLoading };
}

/**
 * The patient's summary, read live on each view. Not revalidated on focus: each read is recorded in
 * the patient's access log, so the chart reads only when it is opened or asked to.
 */
export function useShrSummary(patientUuid: string | undefined) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FetchResponse<unknown>, Error>(
    patientUuid ? `${BASE}/patient/${patientUuid}/summary` : null,
    openmrsFetch,
    { revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false },
  );
  const summary: ShrSummary | null = data ? parseSummary(data.data as never) : null;
  return { summary, refusal: error ? readRefusal(error) : null, isLoading, isValidating, mutate };
}

/** This facility's requests for the patient still awaiting an answer. Empty on any error. */
export function usePendingRequests(patientUuid: string | undefined) {
  const { data, isLoading, mutate } = useSWR<FetchResponse<unknown>, Error>(
    patientUuid ? `${BASE}/patient/${patientUuid}/access-request` : null,
    openmrsFetch,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  return { pending: parsePendingRequests(data?.data), isLoading, mutate };
}

export function requestAccess(patientUuid: string, resourceTypes: Array<string>, accessDays: number) {
  return openmrsFetch(`${BASE}/patient/${patientUuid}/access-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { resourceTypes, accessDays },
  });
}

/** The refusal code from an openmrsFetch error, whichever of the module or the SHR made it. */
export function readRefusal(error: unknown): ShrRefusal {
  const failure = error as { response?: { status?: number }; responseBody?: unknown } | null;
  const status = typeof failure?.response?.status === 'number' ? failure.response.status : null;
  const body = failure?.responseBody as { issue?: Array<{ details?: { text?: string } }> } | null | undefined;
  const code = typeof body === 'object' && body ? body.issue?.[0]?.details?.text : undefined;
  if (code) {
    return { code, status };
  }
  // A gateway in front of the SHR can answer with a page of its own rather than an OperationOutcome.
  return { code: status === null || status >= 500 ? 'shr-unreachable' : 'unknown', status };
}

export function parsePendingRequests(bundle: unknown): Array<PendingRequest> {
  const entries = (bundle as { entry?: Array<{ resource?: any }> } | null)?.entry ?? [];
  return entries
    .map((entry) => entry.resource)
    .filter((task) => task?.resourceType === 'Task')
    .map((task) => ({
      id: String(task.id ?? ''),
      authoredOn: task.authoredOn ?? null,
      expires: task.restriction?.period?.end ?? null,
      resourceTypes: (task.input ?? [])
        .filter((input) => input?.type?.coding?.some((coding) => coding?.code === 'resource-type'))
        .map((input) => input.valueString)
        .filter(Boolean),
    }));
}
