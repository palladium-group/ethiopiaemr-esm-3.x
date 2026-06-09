import dayjs from 'dayjs';
import { parseSyncTime } from './parse-sync-time';

// Jest runs with TZ=UTC (see package.json), so `.local()` is a no-op here and
// we can assert exact wall-clock values.

describe('parseSyncTime', () => {
  it('returns null for null, undefined, and empty input', () => {
    expect(parseSyncTime(null)).toBeNull();
    expect(parseSyncTime(undefined)).toBeNull();
    expect(parseSyncTime('')).toBeNull();
  });

  it('returns null for unparseable strings', () => {
    expect(parseSyncTime('not-a-date')).toBeNull();
  });

  it('parses a naive MySQL DATETIME string as UTC', () => {
    const result = parseSyncTime('2026-06-08 12:34:56');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2026-06-08T12:34:56.000Z');
  });

  it('does not double-shift an ISO string with explicit Z', () => {
    const result = parseSyncTime('2026-06-08T12:34:56Z');
    expect(result!.toISOString()).toBe('2026-06-08T12:34:56.000Z');
  });

  it('returns a dayjs object that supports relative formatting', () => {
    const past = dayjs.utc().subtract(2, 'hours').format('YYYY-MM-DD HH:mm:ss');
    const result = parseSyncTime(past);
    expect(result).not.toBeNull();
    expect(result!.isValid()).toBe(true);
  });
});
