/**
 * Counts the calendar days a patient has occupied a bed, or waited in the admission queue.
 *
 * The start day itself is day one, matching how bed fees are charged: a patient admitted at 23:00
 * and discharged the next morning owes two days. Every tab on the admission page and the bed fee
 * bill go through here so the number a nurse reads is the number the cashier bills.
 *
 * Implemented with the platform Date API (not dayjs) so the ward tables do not depend on the
 * Module Federation shared dayjs singleton, which has been observed to fail at runtime in
 * production after patient data loads.
 *
 * Returns null when the start is unknown, invalid, or later than the end, so callers can render a
 * placeholder rather than a misleading count.
 */
export function countInclusiveDays(
  startDatetime: string | null | undefined,
  endDatetime?: string | null,
): number | null {
  const start = toStartOfLocalDay(startDatetime);
  if (!start) {
    return null;
  }

  const end = toStartOfLocalDay(endDatetime) ?? startOfLocalDay(new Date());
  if (end.getTime() < start.getTime()) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function toStartOfLocalDay(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfLocalDay(parsed);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
