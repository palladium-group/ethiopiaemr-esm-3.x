import { countInclusiveDays } from './stay-duration.utils';

function localIsoAt(year: number, monthIndex: number, day: number, hour = 12): string {
  return new Date(year, monthIndex, day, hour, 0, 0, 0).toISOString();
}

describe('countInclusiveDays', () => {
  it('counts the first day, so a same-day stay is one day', () => {
    expect(countInclusiveDays(localIsoAt(2026, 7, 20, 6), localIsoAt(2026, 7, 20, 15))).toBe(1);
  });

  it('counts a patient admitted today as being in bed for a day', () => {
    const now = new Date();
    expect(countInclusiveDays(localIsoAt(now.getFullYear(), now.getMonth(), now.getDate(), 9))).toBe(1);
  });

  it('counts both ends of a multi-day stay', () => {
    expect(countInclusiveDays(localIsoAt(2026, 7, 20, 12), localIsoAt(2026, 7, 24, 12))).toBe(5);
  });

  it('counts up to today while the patient has no discharge', () => {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    expect(countInclusiveDays(start.toISOString())).toBe(4);
  });

  it('stops counting at the discharge rather than running on to today', () => {
    const admission = new Date();
    admission.setDate(admission.getDate() - 5);
    const discharge = new Date(admission);
    discharge.setDate(discharge.getDate() + 1);
    expect(countInclusiveDays(admission.toISOString(), discharge.toISOString())).toBe(2);
  });

  it('returns null when the start is missing or unparseable', () => {
    expect(countInclusiveDays(null)).toBeNull();
    expect(countInclusiveDays(undefined)).toBeNull();
    expect(countInclusiveDays('')).toBeNull();
    expect(countInclusiveDays('not-a-date')).toBeNull();
  });

  it('returns null rather than a positive count when the start is in the future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    expect(countInclusiveDays(future.toISOString())).toBeNull();
  });

  it('falls back to today when the end is unparseable', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(countInclusiveDays(yesterday.toISOString(), 'not-a-date')).toBe(2);
  });
});
