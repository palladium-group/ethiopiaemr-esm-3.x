import { fetchCurrentPatient, type Encounter, type Visit } from '@openmrs/esm-framework';
import { CONSULTATION_FORM_ENTRY_WORKSPACE } from '../constants';

export type ConsultationFormLaunchOptions = {
  patientUuid: string;
  formUuid: string;
  formName: string;
  encounterUuid?: string;
  handlePostResponse?: (encounter: Encounter) => void;
};

export type ConsultationFormWorkspaceData = {
  formEntryWorkspaceName: string;
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>;
  visitContext: Visit;
  form: {
    visitUuid: string;
    uuid: string;
    visitTypeUuid: string;
  };
  encounterUuid: string;
  handlePostResponse?: (encounter: Encounter) => void;
};

export function buildConsultationFormWorkspaceData(
  patient: Awaited<ReturnType<typeof fetchCurrentPatient>>,
  visit: Visit,
  formUuid: string,
  formName: string,
  encounterUuid = '',
  handlePostResponse?: (encounter: Encounter) => void,
): ConsultationFormWorkspaceData {
  if (!visit.uuid || !visit.visitType?.uuid) {
    throw new Error('Invalid visit data received');
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
    handlePostResponse,
  };
}

export const consultationFormEntryWorkspaceName = CONSULTATION_FORM_ENTRY_WORKSPACE;
