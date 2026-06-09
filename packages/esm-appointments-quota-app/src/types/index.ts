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
  maxAppointmentsLimit?: number | null;
  weeklyAvailability?: Array<WeeklyAvailability>;
}

export type QuotaLimitType = 'block' | 'day' | 'service';

export type QuotaLevel = 'none' | 'ok' | 'warn' | 'full';

export interface QuotaLimitResult {
  type: QuotaLimitType;
  label: string;
  limit: number;
  booked: number;
  level: QuotaLevel;
  blockUuid?: string;
}

export interface QuotaEvaluation {
  serviceUuid: string;
  serviceName: string;
  date: string;
  limits: Array<QuotaLimitResult>;
  /** Tightest level across all applicable limits. */
  primaryLevel: QuotaLevel;
}

export interface AppointmentSummaryDayCount {
  allAppointmentsCount: number;
  missedAppointmentsCount?: number;
}

export interface AppointmentSummaryResponse {
  appointmentService: { uuid: string; name?: string };
  appointmentCountMap: Record<string, AppointmentSummaryDayCount>;
}

export interface AppointmentQuotaLaunchProps {
  serviceUuid?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  /** True when the panel was opened from a recurring appointment booking form. */
  isRecurring?: boolean;
}

/** Minimal shape of community appointments-form-workspace props used for prefill. */
export interface AppointmentsFormWorkspaceProps {
  patientUuid?: string;
  appointment?: {
    service?: { uuid?: string };
    startDateTime?: number | null;
    endDateTime?: number | null;
  };
}
