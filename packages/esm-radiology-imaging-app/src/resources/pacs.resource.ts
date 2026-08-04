import dayjs from 'dayjs';
import { openmrsFetch } from '@openmrs/esm-framework';
import type { RadiologyOrder, RadiologyPatient } from '../radiology-imaging/types';
import type { RadiologyConfig } from '../config-schema';

export interface PacsWorklistTags {
  PatientID: string;
  PatientName: string;
  PatientBirthDate: string;
  PatientSex: string;
  AccessionNumber: string;
  RequestedProcedureDescription: string;
  RequestedProcedureID: string;
  StudyInstanceUID?: string;
  ScheduledProcedureStepSequence: Array<{
    Modality: string;
    ScheduledProcedureStepStartDate: string;
    ScheduledProcedureStepStartTime: string;
    ScheduledProcedureStepDescription: string;
    ScheduledStationAETitle: string;
    ScheduledProcedureStepID: string;
  }>;
}

/**
 * Coarse keyword → DICOM modality code mapping.
 * Priority: first match wins (longest/most-specific keywords first).
 */
const MODALITY_KEYWORDS: Array<[string, string]> = [
  ['computed tomography', 'CT'],
  ['magnetic resonance', 'MR'],
  ['positron emission', 'PT'],
  ['nuclear medicine', 'NM'],
  ['mammograph', 'MG'],
  ['fluoroscop', 'RF'],
  ['angiograph', 'XA'],
  ['ultrasound', 'US'],
  ['echograph', 'US'],
  ['x-ray', 'CR'],
  ['xray', 'CR'],
  ['radiograph', 'DX'],
  ['chest', 'CR'],
  ['\bmri\b', 'MR'],
  ['\bct\b', 'CT'],
  ['\bus\b', 'US'],
  ['\bnm\b', 'NM'],
  ['\bpet\b', 'PT'],
  ['\bmg\b', 'MG'],
];

export function inferModalityFromConcept(conceptDisplay: string): string {
  const lower = conceptDisplay.toLowerCase();
  for (const [keyword, code] of MODALITY_KEYWORDS) {
    if (new RegExp(keyword).test(lower)) {
      return code;
    }
  }
  return 'OT'; // DICOM "Other" — fallback when concept is unrecognised
}

// ─── DICOM date / time helpers ─────────────────────────────────────────────────

/** Formats a Date as DICOM date string: YYYYMMDD */
export function formatDicomDate(date: Date): string {
  return dayjs(date).format('YYYYMMDD');
}

/** Formats a Date as DICOM time string: HHMMSS */
export function formatDicomTime(date: Date): string {
  return dayjs(date).format('HHmmss');
}

// ─── DICOM patient name ────────────────────────────────────────────────────────

/**
 * Converts an OpenMRS display name ("Firstname Lastname") to the
 * DICOM PN component format ("Lastname^Firstname").
 *
 * Single-word names are returned as-is (no caret appended).
 */
export function formatDicomPatientName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  const [first, ...rest] = parts;
  return `${rest.join(' ')}^${first}`;
}

// ─── Patient identifier ────────────────────────────────────────────────────────

/**
 * Returns the preferred identifier value, or the first one if none is marked
 * preferred, or the patient UUID as a last resort.
 */
export function getPreferredIdentifier(patient: RadiologyPatient): string {
  const preferred = patient.identifiers?.find((id) => id.preferred);
  const fallback = patient.identifiers?.[0];
  return preferred?.identifier ?? fallback?.identifier ?? patient.uuid;
}

// ─── Patient sex ───────────────────────────────────────────────────────────────

/** Maps OpenMRS gender values to DICOM patient sex codes (M / F / O). */
export function mapGenderToDicom(gender: string): 'M' | 'F' | 'O' {
  switch (gender?.toUpperCase()) {
    case 'M':
      return 'M';
    case 'F':
      return 'F';
    default:
      return 'O';
  }
}

// ─── Core function ─────────────────────────────────────────────────────────────

export async function createPACSWorkListEntry(
  order: RadiologyOrder,
  config: Pick<RadiologyConfig, 'scheduledStationAETitle'>,
): Promise<void> {
  const { scheduledStationAETitle } = config;

  const stepDate = order.scheduledDate ? new Date(order.scheduledDate) : new Date(order.dateActivated);
  const patientId = getPreferredIdentifier(order.patient);

  const tags: PacsWorklistTags = {
    PatientID: patientId,
    PatientName: formatDicomPatientName(order.patient.person.display),
    PatientBirthDate: order.patient.person.birthdate ? formatDicomDate(new Date(order.patient.person.birthdate)) : '',
    PatientSex: mapGenderToDicom(order.patient.person.gender),
    AccessionNumber: order.orderNumber,
    RequestedProcedureDescription: order.concept.display,
    RequestedProcedureID: order.orderNumber,
    ScheduledProcedureStepSequence: [
      {
        Modality: inferModalityFromConcept(order.concept.display),
        ScheduledProcedureStepStartDate: formatDicomDate(stepDate),
        ScheduledProcedureStepStartTime: formatDicomTime(stepDate),
        ScheduledProcedureStepDescription: order.concept.display,
        ScheduledStationAETitle: scheduledStationAETitle,
        ScheduledProcedureStepID: order.orderNumber,
      },
    ],
  };

  await openmrsFetch('/ws/rest/v1/orthanc/worklists/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Tags: tags }),
  });
}

// ─── PACS health check ─────────────────────────────────────────────────────────

export async function checkPacsHealth(): Promise<boolean> {
  try {
    const response = await openmrsFetch('/ws/rest/v1/orthanc/system', { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── Worklist check ────────────────────────────────────────────────────────────

export type OrthancWorklistCheckResult = {
  exists: boolean;
  queryId?: string;
  answers?: string[];
  firstAnswer?: unknown;
};

export async function checkOrderHasWorklistEntry(accessionNumber: string): Promise<OrthancWorklistCheckResult> {
  const response = await openmrsFetch(
    `/ws/rest/v1/orthanc/worklists?accessionNumber=${encodeURIComponent(accessionNumber)}`,
  );
  if (response.status === 404) {
    return { exists: false };
  }
  if (!response.ok) {
    throw new Error(`Worklist check failed: ${response.status}`);
  }
  const data = response.data;
  const exists = Array.isArray(data) ? data.length > 0 : false;

  return { exists };
}
