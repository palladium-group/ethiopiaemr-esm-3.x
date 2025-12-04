import { openmrsFetch, restBaseUrl, Visit } from '@openmrs/esm-framework';

export const createVisitForPatient = async (patientUuid: string) => {
  const url = `${restBaseUrl}/visit?v=full`;
  const payload = {
    patient: patientUuid,
    visitType: '3371a4d4-f66f-4454-a86d-92c7b3da990c', // Outpatient visit type UUID
  };

  return openmrsFetch<Visit>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};
