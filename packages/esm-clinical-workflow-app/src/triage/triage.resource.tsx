import { openmrsFetch, restBaseUrl, Visit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';

const queueEntryCustomRepresentation =
  'custom:(uuid,display,queue,status,patient:(uuid,display,person,identifiers:(uuid,display,identifier,identifierType)),visit:(uuid,display,startDatetime,encounters:(uuid,display,diagnoses,encounterDatetime,encounterType,obs,encounterProviders,voided),attributes:(uuid,display,value,attributeType)),priority,priorityComment,sortWeight,startedAt,endedAt,locationWaitingFor,queueComingFrom,providerWaitingFor,previousQueueEntry)';

export const createVisitForPatient = async (patientUuid: string, visitTypeUuid: string) => {
  const url = `${restBaseUrl}/visit?v=full`;
  const payload = {
    patient: patientUuid,
    visitType: visitTypeUuid,
  };

  return openmrsFetch<Visit>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const getCurrentVisitForPatient = async (patientUuid: string): Promise<Visit | undefined> => {
  const url = `${restBaseUrl}/visit?v=full&patient=${patientUuid}&includeInactive=false`;
  const { data } = await openmrsFetch<{ results: Array<Visit> }>(url);
  const currentVisit = data.results?.find((visit) => visit.stopDatetime === null);
  return currentVisit;
};

export const fetchQueueEntryForPatient = async (patientUuid: string): Promise<any | undefined> => {
  const url = `${restBaseUrl}/queue-entry?v=${queueEntryCustomRepresentation}&patient=${patientUuid}&includeInactive=false`;
  const { data } = await openmrsFetch<{ results: Array<unknown> }>(url);
  return data.results[0];
};

export const getTriageFormForLocation = (
  locationUuid: string | undefined,
  triageLocationForms: ClinicalWorkflowConfig['triageLocationForms'],
): { formUuid: string; name: string } | undefined => {
  if (!locationUuid) {
    return undefined;
  }
  return triageLocationForms[locationUuid];
};
