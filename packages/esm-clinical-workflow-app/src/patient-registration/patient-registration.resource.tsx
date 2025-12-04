import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export const registerNewPatient = (payload) => {
  const url = `${restBaseUrl}/patient`;

  return openmrsFetch<fhir.Patient>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};
export const generateIdentifier = () => {
  const url = `${restBaseUrl}/idgen/identifiersource/8549f706-7e85-4c1d-9424-217d50a2988b/identifier`;
  return openmrsFetch<fhir.Identifier>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {},
  });
};
