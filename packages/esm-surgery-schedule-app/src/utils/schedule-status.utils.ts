import type { TFunction } from 'i18next';
import type {
  AnesthesiaStatus,
  ContactOutcome,
  ScheduleStatus,
  SurgeryCategory,
} from '../types/elective-surgery-schedule.types';

export type TagType =
  | 'red'
  | 'magenta'
  | 'purple'
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'gray'
  | 'cool-gray'
  | 'warm-gray'
  | 'high-contrast'
  | 'outline';

export interface StatusDisplay {
  labelKey: string;
  defaultLabel: string;
  tagType?: TagType;
}

const scheduleStatusMap: Record<string, StatusDisplay> = {
  REQUESTED: { labelKey: 'scheduleStatusRequested', defaultLabel: 'Requested', tagType: 'gray' },
  PENDING_COMMUNICATION: {
    labelKey: 'scheduleStatusPendingCommunication',
    defaultLabel: 'Pending communication',
    tagType: 'blue',
  },
  COMMUNICATED: { labelKey: 'scheduleStatusCommunicated', defaultLabel: 'Communicated', tagType: 'cyan' },
  READY_TO_ADMIT: { labelKey: 'scheduleStatusReadyToAdmit', defaultLabel: 'Ready to admit', tagType: 'green' },
  RETURNED_PENDING_COMMUNICATION: {
    labelKey: 'scheduleStatusReturned',
    defaultLabel: 'Returned (pending communication)',
    tagType: 'purple',
  },
  CLOSED: { labelKey: 'scheduleStatusClosed', defaultLabel: 'Closed', tagType: 'cool-gray' },
  REMOVED: { labelKey: 'scheduleStatusRemoved', defaultLabel: 'Removed', tagType: 'red' },
};

const anesthesiaStatusMap: Record<string, StatusDisplay> = {
  PENDING_EVAL: { labelKey: 'anesthesiaStatusPendingEval', defaultLabel: 'Pending eval', tagType: 'gray' },
  FIT_FOR_SURGERY: { labelKey: 'anesthesiaStatusFitForSurgery', defaultLabel: 'Fit for surgery', tagType: 'green' },
  RE_EVAL_APPOINTED: {
    labelKey: 'anesthesiaStatusReEvalAppointed',
    defaultLabel: 'Re-eval appointed',
    tagType: 'blue',
  },
  UNFIT_FOR_SURGERY: {
    labelKey: 'anesthesiaStatusUnfitForSurgery',
    defaultLabel: 'Unfit for surgery',
    tagType: 'red',
  },
  SECOND_EVAL_FIT_FOR_ADMISSION: {
    labelKey: 'anesthesiaStatusSecondEvalFit',
    defaultLabel: '2nd eval – Fit for admission',
    tagType: 'green',
  },
  SECOND_EVAL_UNFIT: {
    labelKey: 'anesthesiaStatusSecondEvalUnfit',
    defaultLabel: '2nd eval – Unfit',
    tagType: 'red',
  },
};

const contactOutcomeMap: Record<string, StatusDisplay> = {
  NO_ATTEMPT_YET: { labelKey: 'contactOutcomeNoAttempt', defaultLabel: 'No attempt yet', tagType: 'gray' },
  SUCCESSFUL: { labelKey: 'contactOutcomeSuccessful', defaultLabel: 'Successful', tagType: 'green' },
  NO_RESPONSE: { labelKey: 'contactOutcomeNoResponse', defaultLabel: 'No response', tagType: 'blue' },
  NEEDS_TIME: { labelKey: 'contactOutcomeNeedsTime', defaultLabel: 'Needs time', tagType: 'purple' },
  REAPPOINTED: { labelKey: 'contactOutcomeReappointed', defaultLabel: 'Reappointed', tagType: 'purple' },
  DECEASED: { labelKey: 'contactOutcomeDeceased', defaultLabel: 'Deceased', tagType: 'red' },
  ALTERNATIVE_SERVICE: {
    labelKey: 'contactOutcomeAlternativeService',
    defaultLabel: 'Alternative service',
    tagType: 'cool-gray',
  },
  PATIENT_DECLINES: { labelKey: 'contactOutcomePatientDeclines', defaultLabel: 'Patient declines', tagType: 'red' },
};

export function getScheduleStatusDisplay(status: string): StatusDisplay {
  const normalized = status?.toUpperCase().replace(/[\s-]+/g, '_');
  return scheduleStatusMap[normalized] ?? { labelKey: 'unknownStatus', defaultLabel: status || '--', tagType: 'gray' };
}

export function getAnesthesiaStatusDisplay(status: string): StatusDisplay {
  const normalized = status?.toUpperCase().replace(/[\s-]+/g, '_');
  return (
    anesthesiaStatusMap[normalized] ?? { labelKey: 'unknownStatus', defaultLabel: status || '--', tagType: 'gray' }
  );
}

export function getContactOutcomeDisplay(outcome: string): StatusDisplay {
  const normalized = outcome?.toUpperCase().replace(/[\s-]+/g, '_');
  return contactOutcomeMap[normalized] ?? { labelKey: 'unknownStatus', defaultLabel: outcome || '--', tagType: 'gray' };
}

export function translateStatusDisplay(t: TFunction, display: StatusDisplay): string {
  return t(display.labelKey, display.defaultLabel);
}

export function getCategoryLabel(t: TFunction, category: SurgeryCategory): string {
  const labels: Record<SurgeryCategory, string> = {
    A: t('category1Title', 'Category 1 (1 month SLA)'),
    B: t('category2Title', 'Category 2 (3 months SLA)'),
    C: t('category3Title', 'Category 3 (1 year SLA)'),
  };
  return labels[category];
}

export function getDaysLeftTagType(daysLeft: number): TagType {
  if (daysLeft <= 7) {
    return 'red';
  }
  if (daysLeft <= 14) {
    return 'magenta';
  }
  return 'gray';
}

export const CONTACT_OUTCOME_OPTIONS: Array<{ value: ContactOutcome; labelKey: string; defaultLabel: string }> = [
  { value: 'SUCCESSFUL', labelKey: 'contactOutcomeSuccessful', defaultLabel: 'Successful' },
  { value: 'NO_RESPONSE', labelKey: 'contactOutcomeNoResponse', defaultLabel: 'No response' },
  { value: 'NEEDS_TIME', labelKey: 'contactOutcomeNeedsTime', defaultLabel: 'Needs time / Reappointed' },
  { value: 'DECEASED', labelKey: 'contactOutcomeDeceased', defaultLabel: 'Deceased' },
  {
    value: 'ALTERNATIVE_SERVICE',
    labelKey: 'contactOutcomeAlternativeService',
    defaultLabel: 'Alternative service found',
  },
  { value: 'PATIENT_DECLINES', labelKey: 'contactOutcomePatientDeclines', defaultLabel: 'Patient declines' },
];

export const TERMINAL_CONTACT_OUTCOMES: Array<ContactOutcome> = ['DECEASED', 'ALTERNATIVE_SERVICE', 'PATIENT_DECLINES'];

export function isTerminalContactOutcome(outcome: ContactOutcome): boolean {
  return TERMINAL_CONTACT_OUTCOMES.includes(outcome);
}

export function normalizeScheduleStatus(status: string): ScheduleStatus | string {
  return status?.toUpperCase().replace(/[\s-]+/g, '_') as ScheduleStatus;
}

export function normalizeAnesthesiaStatus(status: string): AnesthesiaStatus | string {
  return status?.toUpperCase().replace(/[\s-]+/g, '_') as AnesthesiaStatus;
}
