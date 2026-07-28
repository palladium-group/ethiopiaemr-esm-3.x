import dayjs from 'dayjs';

export interface AppointmentSummary {
  uuid: string;
  startDateTime: number | string | null;
  dateCreated?: number | string | null;
  dateAppointmentScheduled?: number | string | null;
  service?: {
    name: string;
    uuid: string;
  };
}

function toMillis(value: number | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : null;
}

function getAppointmentScheduledAt(appointment: AppointmentSummary): number {
  return (
    toMillis(appointment.dateAppointmentScheduled) ??
    toMillis(appointment.dateCreated) ??
    toMillis(appointment.startDateTime) ??
    0
  );
}

/**
 * Returns appointments present after the scheduling session that were not present before it.
 * A UUID diff is the most reliable signal that the scheduler actually saved a new appointment
 * (as opposed to merely opening the workspace and cancelling).
 */
export function findNewAppointments(
  appointmentsBefore: Array<AppointmentSummary>,
  appointmentsAfter: Array<AppointmentSummary>,
): Array<AppointmentSummary> {
  const knownUuids = new Set(appointmentsBefore.map((appointment) => appointment.uuid));
  return appointmentsAfter.filter((appointment) => !knownUuids.has(appointment.uuid));
}

/**
 * Ranks appointments by how well their service name matches the order modality, then by
 * most-recently scheduled. Used to disambiguate when several appointments were created.
 */
export function pickAppointmentForModality(
  appointments: Array<AppointmentSummary>,
  modalityCode: string,
): AppointmentSummary | null {
  if (appointments.length === 0) {
    return null;
  }

  if (appointments.length === 1) {
    return appointments[0];
  }

  const modality = modalityCode.toLowerCase();

  const scored = appointments
    .map((appointment) => {
      const serviceName = appointment.service?.name?.toLowerCase() ?? '';
      const modalityMatch = serviceName.includes(modality) || modality.includes(serviceName) ? 1 : 0;
      return { appointment, scheduledAt: getAppointmentScheduledAt(appointment), modalityMatch };
    })
    .sort((a, b) => {
      if (b.modalityMatch !== a.modalityMatch) {
        return b.modalityMatch - a.modalityMatch;
      }
      return b.scheduledAt - a.scheduledAt;
    });

  return scored[0]?.appointment ?? null;
}

/**
 * Selects the appointment created during a scheduling session for a given order.
 * Only considers genuinely new appointments (UUID diff) so that opening the workspace
 * without saving never yields a match.
 */
export function selectNewAppointmentForOrder(
  appointmentsBefore: Array<AppointmentSummary>,
  appointmentsAfter: Array<AppointmentSummary>,
  modalityCode: string,
): AppointmentSummary | null {
  const newAppointments = findNewAppointments(appointmentsBefore, appointmentsAfter);
  return pickAppointmentForModality(newAppointments, modalityCode);
}
