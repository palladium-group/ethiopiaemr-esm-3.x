import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR, { mutate as globalMutate } from 'swr';
import { appointmentServiceListUrl, appointmentServiceUrl } from '../constants';
import type { AppointmentService, AppointmentServiceSavePayload } from '../types';

export const appointmentServicesSwrKey = 'appointment-services';

function parseAppointmentServicesResponse(data: unknown): Array<AppointmentService> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: Array<AppointmentService> }).results;
  }

  return [];
}

export function useAppointmentServices() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: unknown }>(appointmentServicesSwrKey, () =>
    openmrsFetch(appointmentServiceListUrl),
  );

  return {
    appointmentServices: parseAppointmentServicesResponse(data?.data),
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function saveAppointmentService(payload: AppointmentServiceSavePayload) {
  return openmrsFetch(appointmentServiceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  });
}

export function revalidateAppointmentServices() {
  return globalMutate(appointmentServicesSwrKey);
}
