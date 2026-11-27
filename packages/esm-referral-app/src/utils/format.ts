import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ReferralStatus } from '../api/types';

dayjs.extend(utc);
dayjs.extend(relativeTime);

/** Module serialises `yyyy-MM-dd HH:mm:ss` without offset; backend runs UTC. */
export function parseServerTime(raw?: string | null) {
  if (!raw) {
    return null;
  }
  const parsed = dayjs.utc(raw).local();
  return parsed.isValid() ? parsed : null;
}

export function formatDateTime(raw?: string | null) {
  const d = parseServerTime(raw);
  return d ? d.format('DD MMM YYYY, HH:mm') : '—';
}

export function formatRelative(raw?: string | null) {
  const d = parseServerTime(raw);
  return d ? d.fromNow() : '—';
}

export function statusTagType(
  status: ReferralStatus | null | undefined,
): 'gray' | 'blue' | 'green' | 'red' | 'magenta' | 'purple' | 'teal' | 'cyan' {
  switch (status) {
    case 'DRAFT':
      return 'gray';
    case 'PENDING_LIAISON':
      return 'purple';
    case 'REFERRED':
      return 'blue';
    case 'ACCEPTED':
      return 'teal';
    case 'REJECTED':
    case 'CANCELLED':
      return 'red';
    case 'REFERRED_BACK':
    case 'FEEDBACK_SENT':
      return 'cyan';
    case 'RE_REFERRED':
      return 'magenta';
    case 'COMPLETED':
      return 'green';
    default:
      return 'gray';
  }
}

export function humanizeCode(code?: string | null) {
  if (!code) {
    return '—';
  }
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function toServerDateTime(local: string) {
  // datetime-local -> yyyy-MM-dd HH:mm:ss in UTC
  if (!local) {
    return undefined;
  }
  return dayjs(local).utc().format('YYYY-MM-DD HH:mm:ss');
}
