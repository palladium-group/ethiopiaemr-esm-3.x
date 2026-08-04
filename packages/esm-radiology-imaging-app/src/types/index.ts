import { type ConceptName, type ConceptDatatype, type OpenmrsResource } from '@openmrs/esm-framework';
import { type OrderBasketItem } from '@openmrs/esm-patient-common-lib';
export type Link = {
  rel: 'self' | 'full' | string;
  uri: string;
  resourceAlias: string;
};

export type AuditInfo = {
  creator: OpenmrsResource;
  dateCreated: string;
  changedBy: OpenmrsResource | null;
  dateChanged: string | null;
};

export type OrderAction = 'NEW' | 'REVISE' | 'DISCONTINUE' | 'RENEW';

export type OrderUrgency = 'ROUTINE' | 'STAT' | 'ON_SCHEDULED_DATE';

export type Laterality = 'LEFT' | 'RIGHT' | 'BILATERAL';

export type ProcedureStatus =
  | 'PRELIMINARY'
  | 'REVISION_REQUESTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'RESULT_AVAILABLE';

export type ReportType = 'PRELIMINARY' | 'FINAL' | 'ADDENDUM' | 'CORRECTED';

export type ConceptNameType = 'FULLY_SPECIFIED' | 'SHORT' | 'INDEX_TERM' | null;

export type OrderTypeName = 'procedureorder' | 'drugorder' | 'testorder' | string;

export type ConceptClass = {
  uuid: string;
  display: string;
  name?: string;
  description?: string;
  retired?: boolean;
  links: Link[];
  resourceVersion?: string;
};

export type ConceptReferenceTerm = OpenmrsResource;

export type ConceptMapType = OpenmrsResource;

export type ConceptMapping = {
  display: string;
  uuid: string;
  conceptReferenceTerm: ConceptReferenceTerm;
  conceptMapType: ConceptMapType;
  links: Link[];
  resourceVersion?: string;
};

export type ConceptDescription = {
  display: string;
  uuid: string;
  description?: string;
  locale?: string;
  links: Link[];
  resourceVersion?: string;
};

export type ConceptAnswer = {
  uuid: string;
  display: string;
  name: ConceptName;
  datatype: ConceptDatatype;
  conceptClass: ConceptClass;
  set: boolean;
  version: string;
  retired: boolean;
  names: ConceptName[];
  descriptions: ConceptDescription[];
  mappings: ConceptMapping[];
  answers: ConceptAnswer[];
  setMembers: Concept[];
  attributes: ConceptAttribute[];
  links: Link[];
  resourceVersion?: string;
};

export type ConceptAttribute = {
  uuid: string;
  display: string;
  links: Link[];
};

export type Concept = {
  uuid: string;
  display: string;
  name: ConceptName;
  datatype: ConceptDatatype;
  conceptClass: ConceptClass;
  set: boolean;
  version: string | null;
  retired: boolean;
  names: ConceptName[];
  descriptions: ConceptDescription[];
  mappings: ConceptMapping[];
  answers: ConceptAnswer[];
  setMembers: Concept[];
  auditInfo?: AuditInfo;
  attributes: ConceptAttribute[];
  links: Link[];
  resourceVersion?: string;
};

// ============================================================================
// User / Provider / Person Types
// ============================================================================

export type Privilege = OpenmrsResource;

export type Role = OpenmrsResource;

export type Person = OpenmrsResource;

export type Provider = OpenmrsResource;

export type DetailedUser = {
  uuid: string;
  display: string;
  username: string;
  systemId: string;
  userProperties: Record<string, string>;
  person: Person;
  privileges: Privilege[];
  roles: Role[];
  retired: boolean;
  email: string | null;
  links: Link[];
  resourceVersion?: string;
};

// User reference may be either a brief reference or the fully expanded object.
export type UserRef = OpenmrsResource | DetailedUser;

// ============================================================================
// Patient / Encounter / Care Setting Types
// ============================================================================

export type Patient = OpenmrsResource;

export type Encounter = OpenmrsResource;

export type CareSetting = OpenmrsResource;

export type Location = OpenmrsResource;

// ============================================================================
// Order Type Types
// ============================================================================

export type OrderType = {
  uuid: string;
  display: string;
  name: string;
  javaClassName: string;
  retired: boolean;
  description: string;
  conceptClasses: ConceptClass[];
  parent: OrderType | null;
  links: Link[];
  resourceVersion?: string;
};

export type ProcedureNested = {
  uuid: string;
  patient: Patient;
  procedureOrder: OpenmrsResource & { type: OrderTypeName };
  concept: OpenmrsResource;
  procedureReason: Concept | null;
  category: Concept | null;
  bodySite: Concept | null;
  partOf: OpenmrsResource | null;
  startDatetime: string | null;
  endDatetime: string | null;
  status: ProcedureStatus;
  statusReason: string | null;
  outcome: string | null;
  preliminaryReport: string | null;
  preliminaryReportEnteredBy: UserRef | null;
  preliminaryReportEnteredAt: string | null;
  preliminaryReportApprovedBy: UserRef | null;
  preliminaryReportApprovedAt: string | null;
  procedureReport: string | null;
  reportType: ReportType;
  impressions: string | null;
  billingStatus: string | null;
  reportLockedAt: string | null;
  revisionComment: string | null;
  referralReason: string | null;
  referralDestination: string | null;
  referralDate: string | null;
  externalFacilityName: string | null;
  externalStudyDate: string | null;
  externalModality: string | null;
  externalReferringRadiologist: string | null;
  externalImpressionSummary: string | null;
  location: Location | null;
  encounters: Encounter[];
};

/**
 * Procedure Order — the full order resource.
 */
export type ProcedureOrder = {
  uuid: string;
  orderNumber: string;
  accessionNumber: string | null;
  patient: Patient;
  concept: OpenmrsResource;
  action: OrderAction;
  careSetting: CareSetting;
  previousOrder: OpenmrsResource | null;
  dateActivated: string;
  scheduledDate: string | null;
  dateStopped: string | null;
  autoExpireDate: string | null;
  encounter: Encounter;
  orderer: Provider;
  orderReason: Concept | null;
  orderReasonNonCoded: string | null;
  orderType: OrderType;
  urgency: OrderUrgency;
  instructions: string | null;
  commentToFulfiller: string | null;
  display: string;
  specimenSource: Concept | null;
  laterality: Laterality | null;
  clinicalHistory: string | null;
  frequency: OpenmrsResource | null;
  numberOfRepeats: number | null;
  specimenType: Concept | null;
  bodySite: Concept | null;
  relatedProcedure: OpenmrsResource | null;
  procedures: ProcedureNested[];
  category: Concept | null;
  priority: string | null;
  links: Link[];
  type: OrderTypeName;
  resourceVersion?: string;
};

export type Procedure = {
  uuid: string;
  patient: Patient;
  procedureOrder: ProcedureOrder;
  parentOrder: ProcedureOrder;
  concept: Concept;
  procedureReason: Concept | null;
  category: Concept | null;
  bodySite: Concept | null;
  partOf: OpenmrsResource | null;
  startDatetime: string | null;
  endDatetime: string | null;
  status: ProcedureStatus;
  statusReason: string | null;
  outcome: string | null;
  preliminaryReport: string | null;
  preliminaryReportEnteredBy: UserRef | null;
  preliminaryReportEnteredAt: string | null;
  preliminaryReportApprovedBy: UserRef | null;
  preliminaryReportApprovedAt: string | null;
  procedureReport: string | null;
  reportType: ReportType;
  impressions: string | null;
  billingStatus: string | null;
  reportLockedAt: string | null;
  revisionComment: string | null;
  referralReason: string | null;
  referralDestination: string | null;
  referralDate: string | null;
  externalFacilityName: string | null;
  externalStudyDate: string | null;
  externalModality: string | null;
  externalReferringRadiologist: string | null;
  externalImpressionSummary: string | null;
  location: Location | null;
  encounters: Encounter[];
  resourceVersion?: string;
};

export type ProcedureListResponse = {
  results: Procedure[];
};

export interface ImagingOrderBasketItem extends OrderBasketItem {
  testType?: {
    label: string;
    conceptUuid: string;
  };
  urgency?: OrderUrgency;
  instructions?: string;
  orderReason?: string;
  orderReasonNonCoded?: string;
  scheduleDate?: Date | string;
  commentsToFulfiller?: string;
  laterality?: string;
  bodySite?: string;
  orderer?: string;
  careSetting?: string;
}
