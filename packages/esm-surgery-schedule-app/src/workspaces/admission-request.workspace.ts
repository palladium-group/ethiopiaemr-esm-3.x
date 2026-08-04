import type { fetchCurrentPatient, Visit } from '@openmrs/esm-framework';

/**
 * Workspace data shape expected by `@openmrs/esm-patient-forms-app#exportedPatientFormEntryWorkspace`,
 * mirroring the consultation app's form-entry launch pattern.
 */
export type AdmissionRequestWorkspaceData = {
  formEntryWorkspaceName: string;
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>;
  visitContext: Visit;
  form: {
    visitUuid: string;
    uuid: string;
    visitTypeUuid: string;
  };
  encounterUuid: string;
};

export function buildAdmissionRequestWorkspaceData(
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>,
  visit: Visit,
  formUuid: string,
  formName: string,
  encounterUuid: string,
): AdmissionRequestWorkspaceData {
  if (!visit?.uuid || !visit.visitType?.uuid) {
    throw new Error('An active visit is required to open the admission request form.');
  }

  return {
    formEntryWorkspaceName: formName,
    patient,
    visitContext: visit,
    form: {
      visitUuid: visit.uuid,
      uuid: formUuid,
      visitTypeUuid: visit.visitType.uuid,
    },
    encounterUuid,
  };
}
