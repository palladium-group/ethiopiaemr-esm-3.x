import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { installVisitStopInterceptor } from '../queue-room/visit-save-interceptor';

export interface AppointmentSearchItem {
  uuid: string;
  status: string;
}

/**
 * Searches appointments for the patient for the current date, determines any appointment
 * in progress ('CheckedIn' status), and terminates it with 'Completed' status.
 */
export async function completePatientCheckedInAppointments(patientUuid: string): Promise<void> {
  if (!patientUuid) {
    return;
  }

  const searchAppointments = async (startDate: string): Promise<Array<AppointmentSearchItem>> => {
    try {
      const { data } = await openmrsFetch<Array<AppointmentSearchItem>>(`${restBaseUrl}/appointments/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { patientUuid, startDate },
      });
      return (Array.isArray(data) ? data : []).filter((appt) => appt.status === 'CheckedIn');
    } catch (error) {
      console.error('Failed to search appointments for patient checkout:', error);
      return [];
    }
  };

  let inProgress = await searchAppointments(dayjs().startOf('day').toISOString());
  if (!inProgress.length) {
    inProgress = await searchAppointments(dayjs().subtract(6, 'month').toISOString());
  }

  if (!inProgress.length) {
    return;
  }

  const onDate = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Addis_Ababa';

  await Promise.all(
    inProgress.map((appointment) =>
      openmrsFetch(`${restBaseUrl}/appointments/${appointment.uuid}/status-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { toStatus: 'Completed', onDate, timeZone },
      }).catch((err) => console.error(`Failed to complete appointment ${appointment.uuid} on checkout:`, err)),
    ),
  );

  mutate((key) => String(key).includes('/appointment'));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('appointment-updated'));
  }
}

let isSubscribed = false;

/**
 * Installs sync to automatically complete in-progress appointments upon patient checkout.
 */
export function subscribeVisitCheckoutAppointmentSync(): () => void {
  if (isSubscribed) {
    return () => undefined;
  }
  isSubscribed = true;

  const uninstall = installVisitStopInterceptor(({ patientUuid }) => completePatientCheckedInAppointments(patientUuid));

  return () => {
    uninstall();
    isSubscribed = false;
  };
}
