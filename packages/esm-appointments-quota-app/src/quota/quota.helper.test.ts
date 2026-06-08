import type { AppointmentService } from '../types';
import {
  evaluateServiceQuota,
  findMatchingBlocks,
  formatDateKey,
  getDayOfWeekName,
  getQuotaLevel,
  getTightestQuotaLevel,
  isWithinTimeWindow,
  normalizeTimeToMinutes,
  sumDayBlockLimits,
} from './quota.helper';

const mondayBlocksService: AppointmentService = {
  uuid: 'service-1',
  name: 'General OPD',
  maxAppointmentsLimit: 20,
  weeklyAvailability: [
    {
      uuid: 'block-am',
      dayOfWeek: 'MONDAY',
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxAppointmentsLimit: 5,
    },
    {
      uuid: 'block-pm',
      dayOfWeek: 'MONDAY',
      startTime: '13:00:00',
      endTime: '17:00:00',
      maxAppointmentsLimit: 8,
    },
    {
      uuid: 'block-open',
      dayOfWeek: 'MONDAY',
      startTime: '17:00:00',
      endTime: '18:00:00',
      maxAppointmentsLimit: null,
    },
  ],
};

describe('quota.helper', () => {
  describe('normalizeTimeToMinutes', () => {
    it('parses HH:mm and HH:mm:ss', () => {
      expect(normalizeTimeToMinutes('09:00')).toBe(540);
      expect(normalizeTimeToMinutes('09:00:00')).toBe(540);
      expect(normalizeTimeToMinutes('13:30:00')).toBe(810);
    });

    it('returns null for empty or invalid values', () => {
      expect(normalizeTimeToMinutes('')).toBeNull();
      expect(normalizeTimeToMinutes(undefined)).toBeNull();
      expect(normalizeTimeToMinutes('invalid')).toBeNull();
    });
  });

  describe('isWithinTimeWindow', () => {
    it('requires the appointment to fit fully inside the block window', () => {
      expect(isWithinTimeWindow(540, 600, 540, 720)).toBe(true);
      expect(isWithinTimeWindow(540, 780, 540, 720)).toBe(false);
      expect(isWithinTimeWindow(600, 540, 540, 720)).toBe(false);
    });
  });

  describe('sumDayBlockLimits', () => {
    it('sums only blocks with numeric limits and ignores unlimited blocks', () => {
      expect(sumDayBlockLimits(mondayBlocksService.weeklyAvailability, 'MONDAY')).toBe(13);
    });

    it('returns null when no limits are configured for the day', () => {
      expect(sumDayBlockLimits(mondayBlocksService.weeklyAvailability, 'TUESDAY')).toBeNull();
    });
  });

  describe('findMatchingBlocks', () => {
    it('returns blocks that contain the appointment window', () => {
      const matches = findMatchingBlocks(mondayBlocksService.weeklyAvailability, 'MONDAY', 570, 630);
      expect(matches).toHaveLength(1);
      expect(matches[0].uuid).toBe('block-am');
    });
  });

  describe('getQuotaLevel', () => {
    it('returns warn at threshold and full at capacity', () => {
      expect(getQuotaLevel(4, 5, 80)).toBe('warn');
      expect(getQuotaLevel(5, 5, 80)).toBe('full');
      expect(getQuotaLevel(2, 5, 80)).toBe('ok');
      expect(getQuotaLevel(0, 0, 80)).toBe('none');
    });
  });

  describe('getTightestQuotaLevel', () => {
    it('picks the strictest level', () => {
      expect(getTightestQuotaLevel(['ok', 'warn', 'none'])).toBe('warn');
      expect(getTightestQuotaLevel(['ok', 'full'])).toBe('full');
    });
  });

  describe('evaluateServiceQuota', () => {
    const monday = new Date(2026, 5, 8);

    it('checks day sum and service cap when blocks exist for the day', () => {
      const evaluation = evaluateServiceQuota({
        service: mondayBlocksService,
        date: monday,
        dayBookedCount: 11,
        warnThresholdPercent: 80,
      });

      expect(evaluation.limits).toHaveLength(2);
      expect(evaluation.limits.find((limit) => limit.type === 'day')?.limit).toBe(13);
      expect(evaluation.limits.find((limit) => limit.type === 'service')?.limit).toBe(20);
      expect(evaluation.primaryLevel).toBe('warn');
    });

    it('adds block limits when a time window is provided', () => {
      const evaluation = evaluateServiceQuota({
        service: mondayBlocksService,
        date: monday,
        dayBookedCount: 10,
        warnThresholdPercent: 80,
        appointmentStartMinutes: 570,
        appointmentEndMinutes: 630,
        blockBookedCounts: { 'block-am': 4 },
      });

      const blockLimit = evaluation.limits.find((limit) => limit.type === 'block');
      expect(blockLimit?.limit).toBe(5);
      expect(blockLimit?.booked).toBe(4);
      expect(blockLimit?.level).toBe('warn');
    });

    it('checks only the service cap when the day has no blocks', () => {
      const serviceWithoutBlocks: AppointmentService = {
        uuid: 'service-2',
        name: 'Lab',
        maxAppointmentsLimit: 15,
      };

      const evaluation = evaluateServiceQuota({
        service: serviceWithoutBlocks,
        date: monday,
        dayBookedCount: 12,
        warnThresholdPercent: 80,
      });

      expect(evaluation.limits).toHaveLength(1);
      expect(evaluation.limits[0].type).toBe('service');
      expect(evaluation.primaryLevel).toBe('warn');
    });

    it('returns none when no limits apply', () => {
      const evaluation = evaluateServiceQuota({
        service: { uuid: 'service-3', name: 'Open clinic' },
        date: monday,
        dayBookedCount: 3,
        warnThresholdPercent: 80,
      });

      expect(evaluation.limits).toHaveLength(0);
      expect(evaluation.primaryLevel).toBe('none');
    });
  });

  describe('formatDateKey and getDayOfWeekName', () => {
    it('formats dates consistently for summary lookup', () => {
      const date = new Date(2026, 5, 8);
      expect(formatDateKey(date)).toBe('2026-06-08');
      expect(getDayOfWeekName(date)).toBe('MONDAY');
    });
  });
});
