export interface WeeklyAvailability {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxAppointmentsLimit?: number | null;
  uuid?: string;
}

export interface AppointmentService {
  uuid: string;
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  maxAppointmentsLimit?: number | null;
  weeklyAvailability?: Array<WeeklyAvailability>;
  color?: string;
  initialAppointmentStatus?: string;
  location?: { uuid: string; display?: string };
  speciality?: { uuid: string; display?: string };
}
