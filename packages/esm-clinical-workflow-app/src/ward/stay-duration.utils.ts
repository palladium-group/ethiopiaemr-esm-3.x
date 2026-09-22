import dayjs from 'dayjs';

/**
 * Counts the calendar days a patient has occupied a bed, or waited in the admission queue.
 *
 * The start day itself is day one, matching how bed fees are charged: a patient admitted at 23:00
 * and discharged the next morning owes two days. Every tab on the admission page and the bed fee
 * bill go through here so the number a nurse reads is the number the cashier bills.
 *
 * Returns null when the start is unknown, invalid, or later than the end, so callers can render a
 * placeholder rather than a misleading count.
 */
export function countInclusiveDays(
  startDatetime: string | null | undefined,
  endDatetime?: string | null,
): number | null {
  const start = startDatetime ? dayjs(startDatetime) : null;

  if (!start?.isValid()) {
    return null;
  }

  const end = endDatetime && dayjs(endDatetime).isValid() ? dayjs(endDatetime) : dayjs();

  if (end.isBefore(start, 'day')) {
    return null;
  }

  return end.startOf('day').diff(start.startOf('day'), 'day') + 1;
}
