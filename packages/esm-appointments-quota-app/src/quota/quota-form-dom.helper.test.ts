import {
  addMinutesToTime,
  buildQuotaPropsFromSnapshot,
  convert12HourTimeTo24Hour,
  convert24HourTo12Hour,
  getBookingFormSnapshotKey,
  getBookingFormUpdateKey,
  isRecurringModeInDom,
  readBookingFormSnapshotFromDom,
  readRecurringDatesFromDom,
} from './quota-form-dom.helper';

describe('convert12HourTimeTo24Hour', () => {
  it('converts PM times', () => {
    expect(convert12HourTimeTo24Hour('4:30', 'PM')).toBe('16:30');
  });

  it('converts AM times', () => {
    expect(convert12HourTimeTo24Hour('9:15', 'AM')).toBe('09:15');
  });

  it('converts 12:xx PM to 12:xx', () => {
    expect(convert12HourTimeTo24Hour('12:00', 'PM')).toBe('12:00');
  });

  it('converts 12:xx AM to 00:xx', () => {
    expect(convert12HourTimeTo24Hour('12:00', 'AM')).toBe('00:00');
  });
});

describe('convert24HourTo12Hour', () => {
  it('converts afternoon hours to PM', () => {
    expect(convert24HourTo12Hour('16:30')).toEqual({ time12: '04:30', meridiem: 'PM' });
  });

  it('converts morning hours to AM', () => {
    expect(convert24HourTo12Hour('09:15')).toEqual({ time12: '09:15', meridiem: 'AM' });
  });

  it('converts midnight (00:00) to 12:00 AM', () => {
    expect(convert24HourTo12Hour('00:00')).toEqual({ time12: '12:00', meridiem: 'AM' });
  });

  it('converts noon (12:00) to 12:00 PM', () => {
    expect(convert24HourTo12Hour('12:00')).toEqual({ time12: '12:00', meridiem: 'PM' });
  });
});

describe('addMinutesToTime', () => {
  it('adds duration minutes', () => {
    expect(addMinutesToTime('09:00', 30)).toBe('09:30');
  });

  it('wraps past midnight', () => {
    expect(addMinutesToTime('23:45', 30)).toBe('00:15');
  });
});

describe('getBookingFormUpdateKey', () => {
  it('returns a key even when only the form is empty', () => {
    expect(getBookingFormUpdateKey({ serviceName: '', date: null })).toBe('single|||allDay||');
  });

  it('returns a key when only service is set', () => {
    const key = getBookingFormUpdateKey({ serviceName: 'HIV', date: null });
    expect(key).toContain('HIV');
  });

  it('changes when date is added', () => {
    const before = getBookingFormUpdateKey({ serviceName: 'HIV', date: null });
    const after = getBookingFormUpdateKey({ serviceName: 'HIV', date: new Date(2026, 5, 8) });
    expect(before).not.toBe(after);
  });
});

describe('getBookingFormSnapshotKey', () => {
  it('returns empty string when date is missing', () => {
    expect(getBookingFormSnapshotKey({ serviceName: 'HIV', date: null })).toBe('');
  });

  it('returns empty string when service is missing', () => {
    expect(getBookingFormSnapshotKey({ serviceName: '', date: new Date(2026, 5, 8) })).toBe('');
  });

  it('returns a key when both service and date are present (all-day default)', () => {
    const key = getBookingFormSnapshotKey({ serviceName: 'HIV', date: new Date(2026, 5, 8) });
    expect(key).toContain('HIV');
    expect(key).toContain('2026-06-08');
  });

  it('returns a key for an explicit all-day appointment', () => {
    const key = getBookingFormSnapshotKey({
      serviceName: 'HIV',
      date: new Date(2026, 5, 8),
      isAllDay: true,
    });
    expect(key).toContain('HIV');
    expect(key).toContain('2026-06-08');
  });

  it('returns empty string when not all-day and time is missing', () => {
    expect(
      getBookingFormSnapshotKey({
        serviceName: 'HIV',
        date: new Date(2026, 5, 8),
        isAllDay: false,
      }),
    ).toBe('');
  });

  it('returns empty string when not all-day and only start time is present', () => {
    expect(
      getBookingFormSnapshotKey({
        serviceName: 'HIV',
        date: new Date(2026, 5, 8),
        isAllDay: false,
        startTime24: '09:00',
      }),
    ).toBe('');
  });

  it('returns a key when not all-day and both times are present', () => {
    const key = getBookingFormSnapshotKey({
      serviceName: 'HIV',
      date: new Date(2026, 5, 8),
      isAllDay: false,
      startTime24: '09:00',
      endTime24: '09:30',
    });
    expect(key).toContain('HIV');
    expect(key).toContain('2026-06-08');
    expect(key).toContain('09:00');
    expect(key).toContain('09:30');
  });

  it('includes "recurring" marker for recurring appointments', () => {
    const key = getBookingFormSnapshotKey({
      serviceName: 'HIV',
      date: new Date(2026, 5, 8),
      isAllDay: true,
      isRecurring: true,
    });
    expect(key).toContain('recurring');
  });

  it('differentiates single vs recurring keys for the same service+date', () => {
    const snapshot = { serviceName: 'HIV', date: new Date(2026, 5, 8), isAllDay: true };
    const singleKey = getBookingFormSnapshotKey({ ...snapshot, isRecurring: false });
    const recurringKey = getBookingFormSnapshotKey({ ...snapshot, isRecurring: true });
    expect(singleKey).not.toBe(recurringKey);
  });
});

describe('buildQuotaPropsFromSnapshot', () => {
  it('maps date for all-day appointments (no time props)', () => {
    expect(
      buildQuotaPropsFromSnapshot({
        serviceName: 'HIV Consultation',
        date: new Date(2026, 5, 8),
        isAllDay: true,
      }),
    ).toEqual({ date: '2026-06-08' });
  });

  it('maps date and time for non-all-day appointments', () => {
    expect(
      buildQuotaPropsFromSnapshot({
        serviceName: 'HIV Consultation',
        date: new Date(2026, 5, 8),
        isAllDay: false,
        startTime24: '09:00',
        endTime24: '09:30',
      }),
    ).toEqual({ date: '2026-06-08', startTime: '09:00', endTime: '09:30' });
  });

  it('sets isRecurring when snapshot is recurring', () => {
    expect(
      buildQuotaPropsFromSnapshot({
        serviceName: 'HIV',
        date: new Date(2026, 5, 8),
        isAllDay: true,
        isRecurring: true,
      }),
    ).toMatchObject({ date: '2026-06-08', isRecurring: true });
  });

  it('does not set time props when snapshot is all-day even if times exist', () => {
    const props = buildQuotaPropsFromSnapshot({
      serviceName: 'HIV',
      date: new Date(2026, 5, 8),
      isAllDay: true,
      startTime24: '09:00',
      endTime24: '09:30',
    });
    expect(props.startTime).toBeUndefined();
    expect(props.endTime).toBeUndefined();
  });
});

function buildRecurringDateRangeDom(start: [number, number, number], end: [number, number, number]) {
  const [startYear, startMonth, startDay] = start;
  const [endYear, endMonth, endDay] = end;

  document.body.innerHTML = `
    <select id="service"><option value="HIV" selected>HIV</option></select>
    <div id="appointmentRecurringDateRangePicker">
      <div slot="start">
        <span data-type="month">${startMonth}</span>
        <span data-type="day">${startDay}</span>
        <span data-type="year">${startYear}</span>
      </div>
      <div slot="end">
        <span data-type="month">${endMonth}</span>
        <span data-type="day">${endDay}</span>
        <span data-type="year">${endYear}</span>
      </div>
    </div>
  `;
}

describe('isRecurringModeInDom', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns true when the recurring date range picker is in the DOM', () => {
    document.body.innerHTML = '<div id="appointmentRecurringDateRangePicker"></div>';
    expect(isRecurringModeInDom()).toBe(true);
  });

  it('returns false when only the single date picker is present', () => {
    document.body.innerHTML = '<div id="datePickerInput"><input value="2026-06-08" /></div>';
    expect(isRecurringModeInDom()).toBe(false);
  });
});

describe('readRecurringDatesFromDom', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reads start and end dates from slot="start" and slot="end" segments', () => {
    buildRecurringDateRangeDom([2026, 6, 8], [2026, 6, 15]);

    const { startDate, endDate } = readRecurringDatesFromDom();

    expect(startDate).toEqual(new Date(2026, 5, 8));
    expect(endDate).toEqual(new Date(2026, 5, 15));
  });

  it('returns null dates when segments are placeholders', () => {
    document.body.innerHTML = `
      <div id="appointmentRecurringDateRangePicker">
        <div slot="start">
          <span data-type="month" data-placeholder>mm</span>
          <span data-type="day" data-placeholder>dd</span>
          <span data-type="year" data-placeholder>yyyy</span>
        </div>
        <div slot="end"></div>
      </div>
    `;

    const { startDate, endDate } = readRecurringDatesFromDom();

    expect(startDate).toBeNull();
    expect(endDate).toBeNull();
  });
});

describe('readBookingFormSnapshotFromDom (recurring)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the recurring start date when the range picker is present', () => {
    buildRecurringDateRangeDom([2026, 6, 8], [2026, 6, 15]);

    const snapshot = readBookingFormSnapshotFromDom();

    expect(snapshot.isRecurring).toBe(true);
    expect(snapshot.date).toEqual(new Date(2026, 5, 8));
    expect(getBookingFormSnapshotKey(snapshot)).toContain('recurring');
  });

  it('requires time when time picker is visible and all-day toggle is absent', () => {
    buildRecurringDateRangeDom([2026, 6, 8], [2026, 6, 15]);
    document.body.insertAdjacentHTML(
      'beforeend',
      `
        <input id="time-picker" value="09:00" />
        <select id="time-picker-select-1"><option value="AM" selected>AM</option></select>
        <input id="duration" value="30" />
      `,
    );

    const snapshot = readBookingFormSnapshotFromDom();

    expect(snapshot.isAllDay).toBe(false);
    expect(snapshot.startTime24).toBe('09:00');
    expect(snapshot.endTime24).toBe('09:30');
    expect(getBookingFormSnapshotKey(snapshot)).not.toBe('');
  });
});
