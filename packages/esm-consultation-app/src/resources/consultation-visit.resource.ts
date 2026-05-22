import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';

const activeVisitRepresentation = 'custom:(uuid,visitType:(uuid,display),startDatetime,stopDatetime,patient:(uuid))';

export async function getActiveVisitForPatient(patientUuid: string): Promise<Visit | null> {
  const url = `${restBaseUrl}/visit?patient=${patientUuid}&includeInactive=false&v=${activeVisitRepresentation}`;
  const response = await openmrsFetch<{ results: Array<Visit> }>(url);

  return response?.data?.results?.[0] ?? null;
}
