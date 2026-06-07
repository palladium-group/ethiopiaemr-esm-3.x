import type {
  AppointmentService,
  AppointmentServiceFormValues,
  AppointmentServiceSavePayload,
  AvailabilityBlockFormValue,
  WeeklyAvailabilityPayload,
} from '../types';

export function toFormTime(time?: string): string {
  if (!time) {
    return '';
  }

  return time.substring(0, 5);
}

/** Bahmni expects java.sql.Time as "HH:mm:ss". Never send empty strings. */
export function toApiTime(time?: string): string | undefined {
  if (!time?.trim()) {
    return undefined;
  }

  const trimmed = time.trim();

  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }

  return trimmed;
}

export function mapServiceToFormValues(service: AppointmentService): AppointmentServiceFormValues {
  return {
    maxAppointmentsLimit: service.maxAppointmentsLimit ?? null,
    blocks: (service.weeklyAvailability ?? []).map((block, index) => ({
      clientId: block.uuid ?? `existing-${index}`,
      uuid: block.uuid,
      dayOfWeek: block.dayOfWeek,
      startTime: toFormTime(block.startTime),
      endTime: toFormTime(block.endTime),
      maxAppointmentsLimit: block.maxAppointmentsLimit ?? null,
      voided: false,
    })),
  };
}

export function getDayBlockTotal(blocks: Array<AvailabilityBlockFormValue>, dayOfWeek: string): number {
  return blocks
    .filter((block) => block.dayOfWeek === dayOfWeek && !block.voided)
    .reduce((total, block) => total + (block.maxAppointmentsLimit ?? 0), 0);
}

export function mapFormValuesToSavePayload(
  service: AppointmentService,
  values: AppointmentServiceFormValues,
): AppointmentServiceSavePayload {
  const payload: AppointmentServiceSavePayload = {
    uuid: service.uuid,
    name: service.name,
    description: service.description,
    specialityUuid: service.speciality?.uuid,
    locationUuid: service.location?.uuid,
    maxAppointmentsLimit: values.maxAppointmentsLimit,
    durationMins: service.durationMins ?? undefined,
    color: service.color,
    initialAppointmentStatus: service.initialAppointmentStatus,
    weeklyAvailability: values.blocks
      .filter((block) => block.uuid || !block.voided)
      .map((block) => {
        const availability: WeeklyAvailabilityPayload = {
          dayOfWeek: block.dayOfWeek,
          maxAppointmentsLimit: block.maxAppointmentsLimit,
          voided: block.voided ?? false,
        };

        if (block.uuid) {
          availability.uuid = block.uuid;
        }

        const startTime = toApiTime(block.startTime);
        const endTime = toApiTime(block.endTime);

        if (startTime) {
          availability.startTime = startTime;
        }

        if (endTime) {
          availability.endTime = endTime;
        }

        return availability;
      }),
  };

  const serviceStartTime = toApiTime(toFormTime(service.startTime));
  const serviceEndTime = toApiTime(toFormTime(service.endTime));

  if (serviceStartTime) {
    payload.startTime = serviceStartTime;
  }

  if (serviceEndTime) {
    payload.endTime = serviceEndTime;
  }

  return payload;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { responseBody?: { error?: { message?: string } }; message?: string };
  return err?.responseBody?.error?.message ?? err?.message ?? fallback;
}
