import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

interface AllergyResponse {
  results: Array<{
    uuid: string;
    allergen: {
      codedAllergen?: { display: string };
      nonCodedAllergen?: string;
    };
  }>;
}

async function fetchAllergies(patientUuid: string): Promise<string[]> {
  const response = await openmrsFetch<AllergyResponse>(`/ws/rest/v1/patient/${patientUuid}/allergy?v=default`);
  return (response.data?.results ?? [])
    .map((a) => a.allergen.codedAllergen?.display ?? a.allergen.nonCodedAllergen ?? '')
    .filter(Boolean);
}

export function usePatientAllergies(patientUuid: string) {
  return useSWR<string[]>(patientUuid ? `patient-allergies:${patientUuid}` : null, () => fetchAllergies(patientUuid), {
    revalidateOnFocus: false,
  });
}
