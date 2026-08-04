export type SurgeryCategory = 'A' | 'B' | 'C';

export type SurgeryPriority = 'ELECTIVE_A' | 'ELECTIVE_B' | 'ELECTIVE_C';

export type ScheduleStatus =
  | 'REQUESTED'
  | 'PENDING_COMMUNICATION'
  | 'COMMUNICATED'
  | 'READY_TO_ADMIT'
  | 'RETURNED_PENDING_COMMUNICATION'
  | 'CLOSED'
  | 'REMOVED';

export type AnesthesiaStatus =
  | 'PENDING_EVAL'
  | 'FIT_FOR_SURGERY'
  | 'RE_EVAL_APPOINTED'
  | 'UNFIT_FOR_SURGERY'
  | 'SECOND_EVAL_FIT_FOR_ADMISSION'
  | 'SECOND_EVAL_UNFIT';

export type ContactOutcome =
  | 'NO_ATTEMPT_YET'
  | 'SUCCESSFUL'
  | 'NO_RESPONSE'
  | 'NEEDS_TIME'
  | 'DECEASED'
  | 'ALTERNATIVE_SERVICE'
  | 'PATIENT_DECLINES';

export interface ElectiveSurgeryScheduleItem {
  uuid: string;
  patient: {
    uuid: string;
    display: string;
    identifiers?: Array<{ identifier: string; type?: { display?: string } }>;
  };
  requestDate: string;
  priority: SurgeryPriority;
  currentCategory: SurgeryCategory;
  daysLeft: number;
  scheduleStatus: string;
  anesthesiaStatus: string;
  lastContactOutcome: string;
  admissionRequestEncounterUuid?: string;
  removed: boolean;
}

export interface ContactOutcomePayload {
  outcome: ContactOutcome;
  note?: string;
  nextContactDate?: string;
}

export interface RemovePatientPayload {
  reason: string;
}

export interface ReturnFromAdmissionPayload {
  reason: string;
}

export interface NearDeadlineResponse {
  count: number;
}
