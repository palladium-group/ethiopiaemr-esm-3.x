import dayjs from 'dayjs';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';

export interface Appointment {
  uuid: string;
  appointmentNumber: string;
  patient: {
    uuid: string;
    name: string;
    identifier: string;
  };
  service: {
    uuid: string;
    name: string;
  };
  startDateTime: string;
  endDateTime: string;
  appointmentKind: string;
  status: string;
  comments?: string;
  location?: {
    uuid: string;
    name: string;
  };
  provider?: {
    uuid: string;
    display?: string;
    name?: string;
  };
}

export const useAppointmentList = (appointmentStatus: string, date?: string) => {
  const selectedDate = date ? date : dayjs().format('YYYY-MM-DD');
  const startDate = dayjs(selectedDate).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
  const endDate = dayjs(selectedDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
  const searchUrl = `${restBaseUrl}/appointments/search`;

  const fetcher = async ([url, startDate, endDate, status]: [string, string, string, string]) => {
    const response = await openmrsFetch<Array<Appointment>>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        startDate: startDate,
        endDate: endDate,
        status: status,
      },
    });
    return response.data;
  };

  const { data, error, isLoading, mutate } = useSWR<Array<Appointment>, Error>(
    [searchUrl, startDate, endDate, appointmentStatus],
    fetcher,
    { errorRetryCount: 2 },
  );

  return { appointmentList: data ?? [], isLoading, error, mutate };
};

// Fetch all appointments scheduled for today using appointment/all?forDate=...
export const useScheduledAppointments = (paginationParams?: {
  startIndex?: number;
  limit?: number;
  skip?: boolean;
}) => {
  // Format date as: 2026-02-15T00:00:00.000Z (with h:m:s set to 00)
  const forDate = dayjs().format('YYYY-MM-DD') + 'T00:00:00.000Z';
  const appointmentUrl = `${restBaseUrl}/appointment/all?forDate=${forDate}`;

  const shouldSkip = paginationParams?.skip === true;

  const fetcher = async (url: string) => {
    const response = await openmrsFetch<Array<Appointment>>(url);
    return response.data;
  };

  const { data, error, isLoading } = useSWR<Array<Appointment>>(shouldSkip ? null : appointmentUrl, fetcher, {
    errorRetryCount: 2,
  });

  const appointments = shouldSkip ? [] : data ?? [];

  return {
    appointments,
    count: appointments.length,
    isLoading,
    error,
  };
};
