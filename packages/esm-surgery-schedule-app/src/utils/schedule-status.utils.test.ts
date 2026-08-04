import {
  getAnesthesiaStatusDisplay,
  getContactOutcomeDisplay,
  getDaysLeftTagType,
  getScheduleStatusDisplay,
  isTerminalContactOutcome,
} from './schedule-status.utils';

describe('schedule-status.utils', () => {
  it('maps schedule statuses to labels', () => {
    expect(getScheduleStatusDisplay('PENDING_COMMUNICATION').defaultLabel).toBe('Pending communication');
    expect(getScheduleStatusDisplay('READY_TO_ADMIT').tagType).toBe('green');
    expect(getScheduleStatusDisplay('unknown').defaultLabel).toBe('unknown');
  });

  it('maps anesthesia statuses to labels', () => {
    expect(getAnesthesiaStatusDisplay('SECOND_EVAL_FIT_FOR_ADMISSION').defaultLabel).toBe(
      '2nd eval – Fit for admission',
    );
    expect(getAnesthesiaStatusDisplay('PENDING_EVAL').tagType).toBe('gray');
  });

  it('maps contact outcomes to labels', () => {
    expect(getContactOutcomeDisplay('NO_RESPONSE').defaultLabel).toBe('No response');
    expect(getContactOutcomeDisplay('PATIENT_DECLINES').tagType).toBe('red');
  });

  it('identifies terminal contact outcomes', () => {
    expect(isTerminalContactOutcome('DECEASED')).toBe(true);
    expect(isTerminalContactOutcome('SUCCESSFUL')).toBe(false);
  });

  it('returns danger tag type for low days left', () => {
    expect(getDaysLeftTagType(5)).toBe('red');
    expect(getDaysLeftTagType(10)).toBe('magenta');
    expect(getDaysLeftTagType(30)).toBe('gray');
  });
});
