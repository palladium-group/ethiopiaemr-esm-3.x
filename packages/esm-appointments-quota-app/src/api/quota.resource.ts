import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  appointmentServiceListUrl,
  appointmentServiceLoadUrl,
  appointmentSummaryUrl,
  omrsDateFormat,
} from '../constants';
import type { AppointmentService, AppointmentSummaryResponse } from '../types';
import { formatDateKey } from '../quota/quota.helper';

export const appointmentServicesFullSwrKey = 'appointment-services-full';

export function parseAppointmentServicesResponse(data: unknown): Array<AppointmentService> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<AppointmentService> }).results;
  }

  return [];
}

export function parseAppointmentSummariesResponse(data: unknown): Array<AppointmentSummaryResponse> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<AppointmentSummaryResponse> }).results;
  }

  return [];
}

export async function fetchAppointmentServicesFull(): Promise<Array<AppointmentService>> {
  const response = await openmrsFetch<{ data: unknown }>(appointmentServiceListUrl);
  return parseAppointmentServicesResponse(response?.data);
}

export function useAppointmentServicesFull() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: unknown }>(
    appointmentServicesFullSwrKey,
    () => openmrsFetch(appointmentServiceListUrl),
  );

  return {
    appointmentServices: parseAppointmentServicesResponse(data?.data),
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function getAppointmentSummaryUrl(startDate: string, endDate: string): string {
  const startDateTime = dayjs(startDate).startOf('day').format(omrsDateFormat);
  const endDateTime = dayjs(endDate).endOf('day').format(omrsDateFormat);
  const params = new URLSearchParams({
    startDate: startDateTime,
    endDate: endDateTime,
  });

  return `${restBaseUrl}${appointmentSummaryUrl}?${params.toString()}`;
}

export function getServiceDayBookedCount(
  summaries: Array<AppointmentSummaryResponse> | undefined,
  serviceUuid: string,
  date: Date,
): number {
  if (!Array.isArray(summaries)) {
    return 0;
  }

  const dateKey = formatDateKey(date);
  const serviceSummary = summaries.find((summary) => summary.appointmentService.uuid === serviceUuid);
  return serviceSummary?.appointmentCountMap?.[dateKey]?.allAppointmentsCount ?? 0;
}

export function useAppointmentSummaryForDate(date: Date | null) {
  const dateKey = date ? formatDateKey(date) : null;
  const url = dateKey ? getAppointmentSummaryUrl(dateKey, dateKey) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: unknown }>(url, () => openmrsFetch(url!));

  return {
    summaries: parseAppointmentSummariesResponse(data?.data),
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function getServiceLoadUrl(serviceUuid: string, startDateTime: string, endDateTime: string): string {
  const params = new URLSearchParams({
    uuid: serviceUuid,
    startDateTime,
    endDateTime,
  });

  return `${restBaseUrl}${appointmentServiceLoadUrl}?${params.toString()}`;
}

export async function fetchServiceBlockLoad(
  serviceUuid: string,
  startDateTime: string,
  endDateTime: string,
): Promise<number> {
  const response = await openmrsFetch<number>(getServiceLoadUrl(serviceUuid, startDateTime, endDateTime));
  const load = response?.data;

  return typeof load === 'number' ? load : 0;
}

export function buildBlockDateTime(date: Date, time: string): string {
  const minutes = time.trim().substring(0, 5);
  const [hours, mins] = minutes.split(':');
  const combined = dayjs(date).hour(Number(hours)).minute(Number(mins)).second(0).millisecond(0);

  return combined.format(omrsDateFormat);
}

export function useServiceBlockLoad(
  serviceUuid: string | undefined,
  startDateTime: string | undefined,
  endDateTime: string | undefined,
) {
  const url =
    serviceUuid && startDateTime && endDateTime ? getServiceLoadUrl(serviceUuid, startDateTime, endDateTime) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: number }>(url, () => openmrsFetch(url!));

  return {
    load: typeof data?.data === 'number' ? data.data : undefined,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
