import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * The backend returns last_sync as a naive MySQL DATETIME string in UTC
 * (the server runs in UTC; NOW() == UTC_TIMESTAMP()). Parse it explicitly as
 * UTC and convert to the viewer's local zone so relative times and tooltips
 * reflect local time rather than treating the string as already-local.
 */
export function parseSyncTime(value: string | null | undefined): dayjs.Dayjs | null {
  if (!value) {
    return null;
  }
  const parsed = dayjs.utc(value);
  return parsed.isValid() ? parsed.local() : null;
}
