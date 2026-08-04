import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { inferModalityFromConcept } from './pacs.resource';
import { selectNewAppointmentForOrder, type AppointmentSummary } from './appointment-matching.utils';

export type { AppointmentSummary };

const APPOINTMENTS_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZZ';

/**
 * Fetches patient appointments via POST /appointments/search (Bahmni appointments module).
 * GET /appointment?patient= is not supported — that endpoint requires a `uuid` param.
 */
export async function fetchPatientAppointments(
  patientUuid: string,
  referenceTimestamp: number = Date.now(),
): Promise<Array<AppointmentSummary>> {
  const startDate = dayjs(referenceTimestamp).startOf('day').format(APPOINTMENTS_DATE_FORMAT);

  const response = await openmrsFetch<Array<AppointmentSummary>>(`${restBaseUrl}/appointments/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { patientUuid, startDate },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export function findAppointmentForOrder(
  appointmentsBefore: Array<AppointmentSummary>,
  appointmentsAfter: Array<AppointmentSummary>,
  procedureConceptDisplay: string,
): AppointmentSummary | null {
  const modality = inferModalityFromConcept(procedureConceptDisplay);
  return selectNewAppointmentForOrder(appointmentsBefore, appointmentsAfter, modality);
}
