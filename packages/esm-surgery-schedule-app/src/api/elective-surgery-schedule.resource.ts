import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { KeyedMutator } from 'swr';
import { ELECTIVE_SURGERY_API_PATH, ELECTIVE_SURGERY_SCHEDULE_SWR_KEY, NEAR_DEADLINE_SWR_KEY } from '../constants';
import type {
  ContactOutcomePayload,
  ElectiveSurgeryScheduleItem,
  NearDeadlineResponse,
  RemovePatientPayload,
  ReturnFromAdmissionPayload,
  SurgeryCategory,
} from '../types/elective-surgery-schedule.types';

export interface ScheduleListParams {
  category?: SurgeryCategory;
  showRemoved?: boolean;
}

export function getElectiveSurgeryScheduleUrl(params?: ScheduleListParams): string {
  const searchParams = new URLSearchParams();

  if (params?.category) {
    searchParams.set('category', params.category);
  }

  if (params?.showRemoved !== undefined) {
    searchParams.set('showRemoved', String(params.showRemoved));
  }

  const query = searchParams.toString();
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}${query ? `?${query}` : ''}`;
}

export function getElectiveSurgeryScheduleDetailUrl(uuid: string): string {
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}/${uuid}`;
}

export function getElectiveSurgeryScheduleContactUrl(uuid: string): string {
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}/${uuid}/contact`;
}

export function getElectiveSurgeryScheduleReadyToAdmitUrl(uuid: string): string {
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}/${uuid}/ready-to-admit`;
}

export function getElectiveSurgeryScheduleReturnUrl(uuid: string): string {
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}/${uuid}/return-from-admission`;
}

export function getElectiveSurgeryScheduleRemoveUrl(uuid: string): string {
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}/${uuid}/remove`;
}

export function getNearDeadlineUrl(): string {
  return `${restBaseUrl}${ELECTIVE_SURGERY_API_PATH}/near-deadline`;
}

export function parseScheduleListResponse(data: unknown): Array<ElectiveSurgeryScheduleItem> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<ElectiveSurgeryScheduleItem> }).results;
  }

  return [];
}

export function parseNearDeadlineResponse(data: unknown): number {
  if (data && typeof data === 'object' && 'count' in data) {
    const count = (data as NearDeadlineResponse).count;
    return typeof count === 'number' ? count : 0;
  }

  if (typeof data === 'number') {
    return data;
  }

  return 0;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const responseBody = (error as { responseBody?: { error?: { message?: string }; message?: string } }).responseBody;
    if (responseBody?.error?.message) {
      return responseBody.error.message;
    }
    if (responseBody?.message) {
      return responseBody.message;
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }

  return fallback;
}

export function getElectiveSurgeryScheduleSwrKey(showRemoved: boolean) {
  return [ELECTIVE_SURGERY_SCHEDULE_SWR_KEY, showRemoved] as const;
}

export function getNearDeadlineSwrKey() {
  return NEAR_DEADLINE_SWR_KEY;
}

export async function fetchElectiveSurgerySchedule(
  params?: ScheduleListParams,
): Promise<Array<ElectiveSurgeryScheduleItem>> {
  const response = await openmrsFetch<{ data: unknown }>(getElectiveSurgeryScheduleUrl(params));
  return parseScheduleListResponse(response?.data);
}

export async function fetchElectiveSurgeryScheduleDetail(uuid: string): Promise<ElectiveSurgeryScheduleItem> {
  const response = await openmrsFetch<ElectiveSurgeryScheduleItem>(getElectiveSurgeryScheduleDetailUrl(uuid));
  return response.data;
}

export async function fetchNearDeadlineCount(): Promise<number> {
  const response = await openmrsFetch<{ data: unknown }>(getNearDeadlineUrl());
  return parseNearDeadlineResponse(response?.data);
}

export async function recordContactOutcome(uuid: string, payload: ContactOutcomePayload): Promise<void> {
  await openmrsFetch(getElectiveSurgeryScheduleContactUrl(uuid), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

export async function markReadyToAdmit(uuid: string): Promise<void> {
  await openmrsFetch(getElectiveSurgeryScheduleReadyToAdmitUrl(uuid), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {},
  });
}

export async function returnFromAdmission(uuid: string, payload: ReturnFromAdmissionPayload): Promise<void> {
  await openmrsFetch(getElectiveSurgeryScheduleReturnUrl(uuid), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

export async function removePatient(uuid: string, payload: RemovePatientPayload): Promise<void> {
  await openmrsFetch(getElectiveSurgeryScheduleRemoveUrl(uuid), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

export async function revalidateElectiveSurgerySchedule(globalMutate: KeyedMutator<unknown>) {
  await globalMutate((key) => Array.isArray(key) && key[0] === ELECTIVE_SURGERY_SCHEDULE_SWR_KEY);
}
