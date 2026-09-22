import dayjs from 'dayjs';
import { countInclusiveDays } from './stay-duration.utils';

describe('countInclusiveDays', () => {
  it('counts the first day, so a same-day stay is one day', () => {
    expect(countInclusiveDays('2026-08-20T06:00:00.000Z', '2026-08-20T15:00:00.000Z')).toBe(1);
  });

  it('counts a patient admitted today as being in bed for a day', () => {
    expect(countInclusiveDays(dayjs().hour(9).toISOString())).toBe(1);
  });

  it('counts both ends of a multi-day stay', () => {
    expect(countInclusiveDays('2026-08-20T12:00:00.000Z', '2026-08-24T12:00:00.000Z')).toBe(5);
  });

  it('counts up to today while the patient has no discharge', () => {
    expect(countInclusiveDays(dayjs().subtract(3, 'day').toISOString())).toBe(4);
  });

  it('stops counting at the discharge rather than running on to today', () => {
    const admission = dayjs().subtract(5, 'day');
    expect(countInclusiveDays(admission.toISOString(), admission.add(1, 'day').toISOString())).toBe(2);
  });

  it('returns null when the start is missing or unparseable', () => {
    expect(countInclusiveDays(null)).toBeNull();
    expect(countInclusiveDays(undefined)).toBeNull();
    expect(countInclusiveDays('')).toBeNull();
    expect(countInclusiveDays('not-a-date')).toBeNull();
  });

  it('returns null rather than a positive count when the start is in the future', () => {
    expect(countInclusiveDays(dayjs().add(3, 'day').toISOString())).toBeNull();
  });

  it('falls back to today when the end is unparseable', () => {
    expect(countInclusiveDays(dayjs().subtract(1, 'day').toISOString(), 'not-a-date')).toBe(2);
  });
});
