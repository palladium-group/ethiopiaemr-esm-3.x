import { openmrsFetch, restBaseUrl, Visit } from '@openmrs/esm-framework';

export const createVisitForPatient = async (patientUuid: string) => {
  const url = `${restBaseUrl}/visit?v=full`;
  const payload = {
    patient: patientUuid,
    visitType: '3371a4d4-f66f-4454-a86d-92c7b3da990c', // OPD
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
  const url = `${restBaseUrl}/queue-entry?v=custom%3A%28uuid%2Cdisplay%2Cqueue%2Cstatus%2Cpatient%3A%28uuid%2Cdisplay%2Cperson%2Cidentifiers%3A%28uuid%2Cdisplay%2Cidentifier%2CidentifierType%29%29%2Cvisit%3A%28uuid%2Cdisplay%2CstartDatetime%2Cencounters%3A%28uuid%2Cdisplay%2Cdiagnoses%2CencounterDatetime%2CencounterType%2Cobs%2CencounterProviders%2Cvoided%29%2Cattributes%3A%28uuid%2Cdisplay%2Cvalue%2CattributeType%29%29%2Cpriority%2CpriorityComment%2CsortWeight%2CstartedAt%2CendedAt%2ClocationWaitingFor%2CqueueComingFrom%2CproviderWaitingFor%2CpreviousQueueEntry%29&patient=${patientUuid}&includeInactive=false`;
  const { data } = await openmrsFetch<{ results: Array<Visit> }>(url);
  return data.results[0];
};
