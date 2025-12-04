import { openmrsFetch, restBaseUrl, Visit } from '@openmrs/esm-framework';

export const createVisitForPatient = async (patientUuid: string) => {
  const url = `${restBaseUrl}/visit?v=full`;
  const payload = {
    patient: patientUuid,
    visitType: '287463d3-2233-4c69-9851-5841a1f5e109', // OPD
  };

  return openmrsFetch<Visit>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};
