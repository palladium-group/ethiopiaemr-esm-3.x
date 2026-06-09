export interface WeeklyAvailability {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxAppointmentsLimit?: number | null;
  uuid?: string;
  voided?: boolean;
}

export interface AppointmentService {
  uuid: string;
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  maxAppointmentsLimit?: number | null;
  durationMins?: number | null;
  weeklyAvailability?: Array<WeeklyAvailability>;
  color?: string;
  initialAppointmentStatus?: string;
  location?: { uuid: string; display?: string; name?: string };
  speciality?: { uuid: string; display?: string; name?: string };
  serviceTypes?: Array<{ uuid: string; name: string; duration?: number }>;
}

export interface WeeklyAvailabilityPayload {
  uuid?: string;
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
  maxAppointmentsLimit?: number | null;
  voided?: boolean;
}

export interface AppointmentServiceSavePayload {
  uuid: string;
  name: string;
  description?: string;
  specialityUuid?: string;
  locationUuid?: string;
  startTime?: string;
  endTime?: string;
  maxAppointmentsLimit?: number | null;
  durationMins?: number | null;
  color?: string;
  initialAppointmentStatus?: string;
  weeklyAvailability: Array<WeeklyAvailabilityPayload>;
}

export interface AvailabilityBlockFormValue {
  clientId: string;
  uuid?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxAppointmentsLimit?: number | null;
  voided?: boolean;
}

export interface AppointmentServiceFormValues {
  maxAppointmentsLimit: number | null;
  blocks: Array<AvailabilityBlockFormValue>;
}
