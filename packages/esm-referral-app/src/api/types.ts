export type ReferralStatus =
  | 'DRAFT'
  | 'PENDING_LIAISON'
  | 'REFERRED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REFERRED_BACK'
  | 'RE_REFERRED'
  | 'FEEDBACK_SENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type ReferralDirection = 'OUTGOING' | 'INCOMING';
export type ReferralPriority = 'COLD_CASE' | 'EMERGENCY';
export type ReferralPatientType = 'ADULT' | 'MATERNAL' | 'PEDIATRIC' | 'NEONATAL';
export type ReferralType = 'LOCAL' | 'ABROAD';
export type CatchmentTier = 'PRIMARY' | 'SECONDARY' | 'OUTSIDE';

export interface ReferralSummary {
  uuid: string;
  direction: ReferralDirection | null;
  status: ReferralStatus | null;
  priority: ReferralPriority | null;
  patientType: ReferralPatientType | null;
  patientName: string | null;
  patientMrn: string | null;
  referringFacilityCode: string | null;
  referringFacilityName: string | null;
  receivingFacilityCode: string | null;
  receivingFacilityName: string | null;
  requestedService: string | null;
  dateCreated: string | null;
  submittedDate: string | null;
  respondedDate: string | null;
  delivered: boolean;
}

export interface ReferralDetail extends ReferralSummary {
  correlationUuid: string | null;
  remoteReferralUuid: string | null;
  referralType: ReferralType | null;
  patientUuid: string | null;
  patientGivenName: string | null;
  patientFatherName: string | null;
  patientGrandfatherName: string | null;
  patientBirthdate: string | null;
  patientGender: string | null;
  patientPhone: string | null;
  patientRegion: string | null;
  patientZone: string | null;
  patientWoreda: string | null;
  patientHealthId: string | null;
  bloodPressure: string | null;
  respiratoryRate: number | null;
  temperature: number | null;
  pulseRate: number | null;
  oxygenSaturation: number | null;
  transfusionNeeded: string | null;
  bloodGroup: string | null;
  historyOfIllness: string | null;
  physicalExamination: string | null;
  investigationSummary: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  chiefComplaints: string | null;
  department: string | null;
  reasonForReferral: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  escortName: string | null;
  escortPhone: string | null;
  dateChanged: string | null;
}

export interface ReferralActionRecord {
  uuid: string;
  actionType: string | null;
  statusBefore: ReferralStatus | null;
  statusAfter: ReferralStatus | null;
  comment: string | null;
  reasonCode: string | null;
  conditionAtHandover: string | null;
  handoverSummary: string | null;
  receivingDepartment: string | null;
  arrivalDate: string | null;
  feedbackDiagnosis: string | null;
  treatmentSummary: string | null;
  medicationPlan: string | null;
  followUpInstruction: string | null;
  feedbackTreatmentGiven: string | null;
  onwardFacilityCode: string | null;
  onwardFacilityName: string | null;
  actor: string | null;
  dateCreated: string | null;
}

export interface ReferralListResponse {
  status: string;
  message?: string;
  rows: Array<ReferralSummary>;
  total: number;
  offset: number;
  limit: number;
}

export interface ReferralDetailResponse {
  status: string;
  message?: string;
  referral: ReferralDetail;
  actions: Array<ReferralActionRecord>;
}

export interface ReferralOptionsResponse {
  status: string;
  statuses: Array<ReferralStatus>;
  types: Array<ReferralType>;
  priorities: Array<ReferralPriority>;
  patientTypes: Array<ReferralPatientType>;
  rejectionReasons: Array<string>;
  handoverConditions: Array<string>;
}

export interface ReferralDashboardResponse {
  status: string;
  outgoing: Record<string, number>;
  incoming: Record<string, number>;
  rejectionReasons: Record<string, number>;
  averageResponseTimeHours: number | null;
}

export interface CatchmentEntry {
  uuid: string;
  facilityCode: string;
  facilityName: string | null;
  tier: CatchmentTier | null;
  services: Array<string>;
  active: boolean;
  deactivationReason: string | null;
  dateCreated: string | null;
  dateChanged: string | null;
}

export interface CatchmentListResponse {
  status: string;
  rows: Array<CatchmentEntry>;
  total: number;
}

export interface MasterFacility {
  code: string;
  name: string;
}

export interface FacilityDirectoryResponse {
  status: string;
  configured?: boolean;
  rows?: Array<MasterFacility>;
  warning?: string;
  message?: string;
}

export type ReferralDraftPayload = Partial<
  Omit<
    ReferralDetail,
    | 'direction'
    | 'status'
    | 'delivered'
    | 'referringFacilityCode'
    | 'referringFacilityName'
    | 'receivingFacilityCode'
    | 'receivingFacilityName'
    | 'remoteReferralUuid'
    | 'correlationUuid'
  >
> & { uuid?: string };
