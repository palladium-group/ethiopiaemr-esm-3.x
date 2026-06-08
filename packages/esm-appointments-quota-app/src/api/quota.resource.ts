import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { appointmentServiceListUrl, appointmentServiceLoadUrl, appointmentSummaryUrl } from '../constants';
import type { AppointmentService, AppointmentSummaryResponse } from '../types';
import { formatDateKey } from '../quota/quota.helper';

export const appointmentServicesFullSwrKey = 'appointment-services-full';

function parseAppointmentServicesResponse(data: unknown): Array<AppointmentService> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<AppointmentService> }).results;
  }

  return [];
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
  return `${restBaseUrl}${appointmentSummaryUrl}?startDate=${startDate}&endDate=${endDate}`;
}

export function getServiceDayBookedCount(
  summaries: Array<AppointmentSummaryResponse> | undefined,
  serviceUuid: string,
  date: Date,
): number {
  const dateKey = formatDateKey(date);
  const serviceSummary = summaries?.find((summary) => summary.appointmentService.uuid === serviceUuid);
  return serviceSummary?.appointmentCountMap?.[dateKey]?.allAppointmentsCount ?? 0;
}

export function useAppointmentSummaryForDate(date: Date | null) {
  const dateKey = date ? formatDateKey(date) : null;
  const url = dateKey ? getAppointmentSummaryUrl(dateKey, dateKey) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: Array<AppointmentSummaryResponse> }>(
    url,
    () => openmrsFetch(url!),
  );

  return {
    summaries: data?.data ?? [],
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

  return combined.format();
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
