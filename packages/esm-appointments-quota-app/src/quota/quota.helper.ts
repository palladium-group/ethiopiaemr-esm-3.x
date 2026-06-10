import { DAYS_OF_WEEK, type DayOfWeek } from '../constants';
import type { AppointmentService, QuotaEvaluation, QuotaLevel, QuotaLimitResult, WeeklyAvailability } from '../types';

const QUOTA_LEVEL_RANK: Record<QuotaLevel, number> = {
  none: 0,
  ok: 1,
  warn: 2,
  full: 3,
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayOfWeekName(date: Date): DayOfWeek {
  return DAYS_OF_WEEK[date.getDay()];
}

/** Parses HH:mm or HH:mm:ss to minutes since midnight. */
export function normalizeTimeToMinutes(time?: string): number | null {
  if (!time?.trim()) {
    return null;
  }

  const [hoursPart, minutesPart] = time.trim().substring(0, 8).split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function isWithinTimeWindow(
  appointmentStartMinutes: number,
  appointmentEndMinutes: number,
  windowStartMinutes: number,
  windowEndMinutes: number,
): boolean {
  if (appointmentStartMinutes >= appointmentEndMinutes) {
    return false;
  }

  return appointmentStartMinutes >= windowStartMinutes && appointmentEndMinutes <= windowEndMinutes;
}

export function getActiveBlocksForDay(
  blocks: Array<WeeklyAvailability> | undefined,
  dayOfWeek: string,
): Array<WeeklyAvailability> {
  return (blocks ?? []).filter((block) => block.dayOfWeek === dayOfWeek && !block.voided);
}

/** Sum block limits for a day; blocks without a numeric limit are excluded. Returns null when no limits apply. */
export function sumDayBlockLimits(blocks: Array<WeeklyAvailability> | undefined, dayOfWeek: string): number | null {
  const limits = getActiveBlocksForDay(blocks, dayOfWeek)
    .map((block) => block.maxAppointmentsLimit)
    .filter((limit): limit is number => limit != null && limit >= 0);

  if (limits.length === 0) {
    return null;
  }

  return limits.reduce((total, limit) => total + limit, 0);
}

export function findMatchingBlocks(
  blocks: Array<WeeklyAvailability> | undefined,
  dayOfWeek: string,
  appointmentStartMinutes: number,
  appointmentEndMinutes: number,
): Array<WeeklyAvailability> {
  return getActiveBlocksForDay(blocks, dayOfWeek).filter((block) => {
    const blockStart = normalizeTimeToMinutes(block.startTime);
    const blockEnd = normalizeTimeToMinutes(block.endTime);

    if (blockStart == null || blockEnd == null) {
      return false;
    }

    return isWithinTimeWindow(appointmentStartMinutes, appointmentEndMinutes, blockStart, blockEnd);
  });
}

export function getQuotaLevel(
  booked: number,
  limit: number | null | undefined,
  warnThresholdPercent: number,
): QuotaLevel {
  if (limit == null || limit <= 0) {
    return 'none';
  }

  if (booked >= limit) {
    return 'full';
  }

  const percentUsed = (booked / limit) * 100;

  if (percentUsed >= warnThresholdPercent) {
    return 'warn';
  }

  return 'ok';
}

export function getTightestQuotaLevel(levels: Array<QuotaLevel>): QuotaLevel {
  return levels.reduce<QuotaLevel>((tightest, level) => {
    return QUOTA_LEVEL_RANK[level] > QUOTA_LEVEL_RANK[tightest] ? level : tightest;
  }, 'none');
}

function buildLimitResult(
  type: QuotaLimitResult['type'],
  label: string,
  limit: number | null | undefined,
  booked: number,
  warnThresholdPercent: number,
  blockUuid?: string,
): QuotaLimitResult | null {
  if (limit == null || limit <= 0) {
    return null;
  }

  return {
    type,
    label,
    limit,
    booked,
    level: getQuotaLevel(booked, limit, warnThresholdPercent),
    blockUuid,
  };
}

export interface EvaluateServiceQuotaInput {
  service: AppointmentService;
  date: Date;
  dayBookedCount: number;
  warnThresholdPercent: number;
  appointmentStartMinutes?: number;
  appointmentEndMinutes?: number;
  blockBookedCounts?: Record<string, number>;
}

/**
 * Evaluates applicable capacity limits for a service on a given date.
 * When weekly blocks exist: checks matching block limits (if time provided), day sum, and service cap.
 * When no blocks exist for the day: checks service cap only.
 */
export function evaluateServiceQuota({
  service,
  date,
  dayBookedCount,
  warnThresholdPercent,
  appointmentStartMinutes,
  appointmentEndMinutes,
  blockBookedCounts = {},
}: EvaluateServiceQuotaInput): QuotaEvaluation {
  const dayOfWeek = getDayOfWeekName(date);
  const dayBlocks = getActiveBlocksForDay(service.weeklyAvailability, dayOfWeek);
  const limits: Array<QuotaLimitResult> = [];

  const hasTimeWindow =
    appointmentStartMinutes != null && appointmentEndMinutes != null && appointmentStartMinutes < appointmentEndMinutes;

  if (dayBlocks.length > 0) {
    const daySumLimit = sumDayBlockLimits(service.weeklyAvailability, dayOfWeek);
    const dayLimitResult = buildLimitResult('day', 'Day total', daySumLimit, dayBookedCount, warnThresholdPercent);

    if (dayLimitResult) {
      limits.push(dayLimitResult);
    }

    const serviceLimitResult = buildLimitResult(
      'service',
      'Service daily cap',
      service.maxAppointmentsLimit,
      dayBookedCount,
      warnThresholdPercent,
    );

    if (serviceLimitResult) {
      limits.push(serviceLimitResult);
    }

    if (hasTimeWindow) {
      const matchingBlocks = findMatchingBlocks(
        service.weeklyAvailability,
        dayOfWeek,
        appointmentStartMinutes,
        appointmentEndMinutes,
      );

      matchingBlocks.forEach((block, index) => {
        const blockBooked = block.uuid ? blockBookedCounts[block.uuid] ?? 0 : 0;
        const blockLabel =
          block.startTime && block.endTime ? `${block.startTime}–${block.endTime}` : `Block ${index + 1}`;
        const blockLimitResult = buildLimitResult(
          'block',
          blockLabel,
          block.maxAppointmentsLimit,
          blockBooked,
          warnThresholdPercent,
          block.uuid,
        );

        if (blockLimitResult) {
          limits.push(blockLimitResult);
        }
      });
    }
  } else {
    const serviceLimitResult = buildLimitResult(
      'service',
      'Service daily cap',
      service.maxAppointmentsLimit,
      dayBookedCount,
      warnThresholdPercent,
    );

    if (serviceLimitResult) {
      limits.push(serviceLimitResult);
    }
  }

  return {
    serviceUuid: service.uuid,
    serviceName: service.name,
    date: formatDateKey(date),
    limits,
    primaryLevel: getTightestQuotaLevel(limits.map((limit) => limit.level)),
  };
}
