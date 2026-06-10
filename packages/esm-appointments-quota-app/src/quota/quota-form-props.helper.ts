import { formatDateKey } from './quota.helper';
import type { AppointmentQuotaLaunchProps, AppointmentsFormWorkspaceProps } from '../types';

function formatTimeHHmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Prefills quota panel fields when opened alongside an edit-appointment form. */
export function deriveQuotaPropsFromFormProps(
  props: Record<string, unknown> | null | undefined,
): AppointmentQuotaLaunchProps {
  const formProps = props as AppointmentsFormWorkspaceProps | null | undefined;
  const appointment = formProps?.appointment;

  if (!appointment?.service?.uuid || appointment.startDateTime == null) {
    return {};
  }

  const start = new Date(appointment.startDateTime);
  const end = appointment.endDateTime != null ? new Date(appointment.endDateTime) : start;

  return {
    serviceUuid: appointment.service.uuid,
    date: formatDateKey(start),
    startTime: formatTimeHHmm(start),
    endTime: formatTimeHHmm(end),
  };
}

export function parseDateKey(dateKey?: string): Date | null {
  if (!dateKey?.trim()) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = dateKey.split('-').map(Number);

  if ([yearPart, monthPart, dayPart].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(yearPart, monthPart - 1, dayPart);
}
