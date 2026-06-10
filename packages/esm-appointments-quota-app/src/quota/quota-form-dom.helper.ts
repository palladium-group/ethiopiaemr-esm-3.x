import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { formatDateKey } from './quota.helper';
import type { AppointmentQuotaLaunchProps } from '../types';

dayjs.extend(customParseFormat);

// ---------------------------------------------------------------------------
// Toggle helpers
// ---------------------------------------------------------------------------

/**
 * Reads the checked state of a Carbon Toggle by its id.
 * Handles both Carbon v11 (button[role="switch"]) and v10 (input[type="checkbox"]).
 */
export function readToggleFromDom(id: string, defaultValue: boolean): boolean {
  if (typeof document === 'undefined') {
    return defaultValue;
  }

  // Carbon v11 — renders as <button role="switch" aria-checked="true|false">
  const btn = document.querySelector<HTMLButtonElement>(`button#${id}[role="switch"]`);
  if (btn) {
    return btn.getAttribute('aria-checked') === 'true';
  }

  // Carbon v10 — renders as <input type="checkbox">
  const checkbox = document.querySelector<HTMLInputElement>(`input#${id}[type="checkbox"]`);
  if (checkbox) {
    return checkbox.checked;
  }

  return defaultValue;
}

// ---------------------------------------------------------------------------
// Date picker helpers
// ---------------------------------------------------------------------------

/**
 * Returns the raw text value currently shown in the single-date picker input.
 * Used as a backup when the flatpickr instance isn't attached to the element.
 */
export function getDatePickerRawValue(): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const root = document.querySelector('[data-testid="datePickerInput"]') ?? document.querySelector('#datePickerInput');
  const input = root?.querySelector('input') ?? document.querySelector<HTMLInputElement>('#datePickerInput');

  return input?.value?.trim() ?? '';
}

/**
 * True when the recurring appointment section is rendered in the booking form.
 * More reliable than reading `#recurringToggle` because that toggle is uncontrolled
 * and only wired via `onClick`.
 */
export function isRecurringModeInDom(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return !!(
    document.querySelector('#appointmentRecurringDateRangePicker') ??
    document.querySelector('[data-testid="appointmentRecurringDateRangePicker"]')
  );
}

/**
 * Reads a segment value from an Openmrs React Aria DateInput container.
 * Segments render as `span[data-type="year|month|day"]`; spinbuttons are a fallback.
 */
function readDateSegmentValue(container: Element, type: 'year' | 'month' | 'day'): number | null {
  const segment = container.querySelector<HTMLElement>(`[data-type="${type}"]`);

  if (segment && !segment.hasAttribute('data-placeholder')) {
    const value = Number(segment.textContent?.trim());

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  const spinbuttons = container.querySelectorAll<HTMLElement>('[role="spinbutton"]');

  for (const btn of spinbuttons) {
    const label = btn.getAttribute('aria-label')?.toLowerCase().trim();
    const raw = btn.getAttribute('aria-valuenow');

    if (label === type && raw !== null && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
  }

  return null;
}

/**
 * Reads a `Date` from a React Aria DateInput (`[slot="start"]` or `[slot="end"]`).
 * Returns `null` if any segment is missing or still a placeholder.
 */
function readDateFromReactAriaDateInput(container: Element | null): Date | null {
  if (!container) {
    return null;
  }

  const year = readDateSegmentValue(container, 'year');
  const month = readDateSegmentValue(container, 'month');
  const day = readDateSegmentValue(container, 'day');

  if (year == null || month == null || day == null) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/**
 * Reads the start and end dates from the recurring appointment date range picker.
 * The component (`OpenmrsDateRangePicker`) is React Aria-based, so dates live in
 * spinbutton segments rather than plain text inputs.
 */
export function readRecurringDatesFromDom(): { startDate: Date | null; endDate: Date | null } {
  if (typeof document === 'undefined') {
    return { startDate: null, endDate: null };
  }

  const container =
    document.querySelector('#appointmentRecurringDateRangePicker') ??
    document.querySelector('[data-testid="appointmentRecurringDateRangePicker"]');

  if (!container) {
    return { startDate: null, endDate: null };
  }

  const startInput = container.querySelector('[slot="start"]');
  const endInput = container.querySelector('[slot="end"]');

  return {
    startDate: readDateFromReactAriaDateInput(startInput),
    endDate: readDateFromReactAriaDateInput(endInput),
  };
}

/**
 * Infers whether the appointment is all-day when the All Day toggle may be absent.
 */
function readAllDayFromDom(): boolean {
  const hasToggle =
    document.querySelector('button#allDayToggle[role="switch"]') ??
    document.querySelector('input#allDayToggle[type="checkbox"]');

  if (hasToggle) {
    return readToggleFromDom('allDayToggle', true);
  }

  // When the toggle is not rendered, the community form only mounts `#time-picker`
  // for timed appointments (`!isAllDayAppointment`).
  if (document.querySelector('#time-picker')) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Single-appointment date (flatpickr / plain input)
// ---------------------------------------------------------------------------

export function readDateFromBookingFormDom(): Date | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const root = document.querySelector('[data-testid="datePickerInput"]') ?? document.querySelector('#datePickerInput');
  const input = root?.querySelector('input');

  if (!input) {
    return null;
  }

  const flatpickrDate = (input as { _flatpickr?: { selectedDates?: Array<Date> } })._flatpickr?.selectedDates?.[0];

  if (flatpickrDate) {
    return flatpickrDate;
  }

  const value = input.value?.trim();

  if (!value) {
    return null;
  }

  const parsed = dayjs(value, ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'M/D/YYYY'], true);

  return parsed.isValid() ? parsed.toDate() : null;
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

export function convert12HourTimeTo24Hour(time: string, meridiem: 'AM' | 'PM'): string | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = match[2];

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Converts a 24-hour HH:mm string to 12-hour format with AM/PM.
 * Returns `{ time12: 'hh:mm', meridiem: 'AM' | 'PM' }`.
 */
export function convert24HourTo12Hour(time24: string): { time12: string; meridiem: 'AM' | 'PM' } {
  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return { time12: '', meridiem: 'AM' };
  }

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const meridiem: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;

  return { time12: `${String(hours12).padStart(2, '0')}:${minutes}`, meridiem };
}

export function addMinutesToTime(time24: string, minutesToAdd: number): string {
  const [hoursPart, minutesPart] = time24.split(':').map(Number);
  const totalMinutes = hoursPart * 60 + minutesPart + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export interface BookingFormSnapshot {
  serviceName: string;
  /**
   * The effective appointment date:
   * - non-recurring: the single date from `#datePickerInput`
   * - recurring: the start date from `#appointmentRecurringDateRangePicker`
   */
  date: Date | null;
  startTime24?: string;
  endTime24?: string;
  /** True when the All Day toggle is on. Defaults to `true` (no time required). */
  isAllDay?: boolean;
  /** True when the Recurring toggle is on. */
  isRecurring?: boolean;
  /** End date of a recurring range — only set when isRecurring is true. */
  recurringEndDate?: Date | null;
}

export function readBookingFormSnapshotFromDom(): BookingFormSnapshot {
  const serviceName = document.querySelector<HTMLSelectElement>('#service')?.value?.trim() ?? '';

  // Recurring / all-day states
  const isRecurring = isRecurringModeInDom();
  const isAllDay = readAllDayFromDom();

  // Date — source differs between single and recurring appointments
  let date: Date | null;
  let recurringEndDate: Date | null | undefined;

  if (isRecurring) {
    const { startDate, endDate } = readRecurringDatesFromDom();
    date = startDate;
    recurringEndDate = endDate;
  } else {
    date = readDateFromBookingFormDom();
  }

  // Time (shared between single and recurring when not all-day)
  const startTime12 = document.querySelector<HTMLInputElement>('#time-picker')?.value?.trim();
  const meridiem = document.querySelector<HTMLSelectElement>('#time-picker-select-1')?.value as 'AM' | 'PM' | undefined;
  const durationRaw = document.querySelector<HTMLInputElement>('#duration')?.value;
  const duration = durationRaw ? Number(durationRaw) : null;

  let startTime24: string | undefined;
  let endTime24: string | undefined;

  if (!isAllDay && startTime12 && meridiem) {
    const converted = convert12HourTimeTo24Hour(startTime12, meridiem);

    if (converted) {
      startTime24 = converted;

      if (duration && duration > 0) {
        endTime24 = addMinutesToTime(converted, duration);
      }
    }
  }

  return { serviceName, date, startTime24, endTime24, isAllDay, isRecurring, recurringEndDate };
}

/**
 * Change-detection key for overlay prop sync. Includes whatever the user has
 * entered so far — does not require a complete service + date + time snapshot.
 */
export function getBookingFormUpdateKey(snapshot: BookingFormSnapshot): string {
  const allDay = snapshot.isAllDay ?? true;

  return [
    snapshot.isRecurring ? 'recurring' : 'single',
    snapshot.serviceName,
    snapshot.date ? formatDateKey(snapshot.date) : '',
    allDay ? 'allDay' : 'timed',
    snapshot.startTime24 ?? '',
    snapshot.endTime24 ?? '',
  ].join('|');
}

export function getBookingFormSnapshotKey(snapshot: BookingFormSnapshot): string {
  if (!snapshot.date || !snapshot.serviceName) {
    return '';
  }

  // When the appointment is NOT all-day, both start and end time must be present
  // before we consider the snapshot actionable.
  const allDay = snapshot.isAllDay ?? true;
  if (!allDay && (!snapshot.startTime24 || !snapshot.endTime24)) {
    return '';
  }

  return [
    snapshot.isRecurring ? 'recurring' : 'single',
    snapshot.serviceName,
    formatDateKey(snapshot.date),
    allDay ? '' : snapshot.startTime24 ?? '',
    allDay ? '' : snapshot.endTime24 ?? '',
  ].join('|');
}

export function buildQuotaPropsFromSnapshot(snapshot: BookingFormSnapshot): AppointmentQuotaLaunchProps {
  const props: AppointmentQuotaLaunchProps = {};

  if (snapshot.date) {
    props.date = formatDateKey(snapshot.date);
  }

  const allDay = snapshot.isAllDay ?? true;
  if (!allDay) {
    if (snapshot.startTime24) {
      props.startTime = snapshot.startTime24;
    }
    if (snapshot.endTime24) {
      props.endTime = snapshot.endTime24;
    }
  }

  if (snapshot.isRecurring) {
    props.isRecurring = true;
  }

  return props;
}
