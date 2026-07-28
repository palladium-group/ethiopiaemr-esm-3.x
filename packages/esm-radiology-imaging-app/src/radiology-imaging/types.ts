// ─── Shared primitives ────────────────────────────────────────────────────────

import { type Encounter } from '@openmrs/esm-framework';
import { type Procedure } from '../types';

export interface OpenmrsRef {
  uuid: string;
  display: string;
}

// ─── Domain-specific enums ────────────────────────────────────────────────────

/** Maps to the OpenMRS `OrderAction` REST enum */
export type OrderAction = 'DISCONTINUE' | 'NEW' | 'RENEW' | 'REVISE';

/** Maps to the OpenMRS `OrderUrgency` REST enum */
export type OrderUrgency = 'ON_SCHEDULED_DATE' | 'ROUTINE' | 'STAT';

/** Maps to the OpenMRS `FulfillerStatus` REST enum */
export type FulfillerStatus =
  | 'COMPLETED'
  | 'DECLINED'
  | 'DISCONTINUED'
  | 'DRAFT'
  | 'EXCEPTION'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RECEIVED';

/** Anatomical laterality as defined by the OpenMRS radiology module */
export type Laterality = 'BILATERAL' | 'LEFT' | 'NA' | 'RIGHT';

// ─── Nested shapes produced by the custom representation ──────────────────────

export interface PatientIdentifier {
  uuid: string;
  display: string;
  identifier: string;
  identifierType: OpenmrsRef;
  preferred: boolean;
}

export interface RadiologyPatient {
  uuid: string;
  display: string;
  identifiers: Array<PatientIdentifier>;
  person: {
    uuid: string;
    display: string;
    age: number;
    gender: string;
    birthdate: string | null;
  };
}

export interface ConceptClass {
  uuid: string;
  display: string;
  name: string;
}

export interface RadiologyConcept {
  uuid: string;
  display: string;
  conceptClass: ConceptClass;
}

// ─── Main type ────────────────────────────────────────────────────────────────

/**
 * Radiology order shape returned by:
 *
 * custom:(uuid,orderNumber,patient:(uuid,display,identifiers,person:(uuid,display,age,gender)),
 * concept:(uuid,display,conceptClass),action,careSetting,orderer:ref,urgency,instructions,
 * orderReasonNonCoded,orderReason,bodySite,laterality,commentToFulfiller,procedures,display,
 * fulfillerStatus,dateStopped,scheduledDate,dateActivated,fulfillerComment,encounter)
 */
export interface RadiologyOrder {
  uuid: string;
  display: string;
  orderNumber: string;

  patient: RadiologyPatient;

  /** The radiology procedure concept (e.g. "X-Ray Chest PA"). */
  concept: RadiologyConcept;

  action: OrderAction;

  /** Outpatient / Inpatient care setting reference. */
  careSetting: OpenmrsRef;

  /** Ordering provider — returned as a bare ref by `:ref`. */
  orderer: OpenmrsRef;

  urgency: OrderUrgency;

  instructions: string | null;
  orderReasonNonCoded: string | null;

  /** Coded reason for ordering (a concept reference). */
  orderReason: OpenmrsRef | null;

  /** Anatomical region to be imaged (a concept reference). */
  bodySite: OpenmrsRef | null;

  laterality: Laterality | null;

  commentToFulfiller: string | null;

  /** Associated procedure records linked to this order. */
  procedures: Array<Procedure>;

  fulfillerStatus: FulfillerStatus | null;
  fulfillerComment: string | null;

  /** ISO-8601 date string; null if the order is still active. */
  dateStopped: string | null;

  /** ISO-8601 date string; null if not scheduled in advance. */
  scheduledDate: string | null;

  /** ISO-8601 date string of when the order was activated. */
  dateActivated: string;

  /** Encounter in which the order was placed (bare ref). */
  encounter: Encounter;
}
