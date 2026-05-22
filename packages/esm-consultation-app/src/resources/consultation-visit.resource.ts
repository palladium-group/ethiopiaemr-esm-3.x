import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';

export async function getActiveVisitForPatient(patientUuid: string): Promise<Visit | null> {
  const url = `${restBaseUrl}/visit?v=full&patient=${patientUuid}&includeInactive=false`;
  const response = await openmrsFetch<{ results: Array<Visit> }>(url);

  return response?.data?.results?.find((visit) => visit.stopDatetime === null) ?? null;
}
