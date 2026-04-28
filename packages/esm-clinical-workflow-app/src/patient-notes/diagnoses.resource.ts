import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface EncounterDiagnosis {
  uuid: string;
  display: string;
  certainty: string;
  rank: number;
  voided: boolean;
}

interface EncounterWithDiagnoses {
  uuid: string;
  encounterDatetime: string;
  diagnoses: Array<EncounterDiagnosis>;
}

interface EncounterResponse {
  results: Array<EncounterWithDiagnoses>;
}

export interface PatientDiagnosis {
  id: string;
  display: string;
  certainty: string;
  rank: number;
  encounterUuid: string;
  encounterDatetime: string;
}

export function usePatientDiagnoses(patientUuid: string) {
  const customRepresentation = 'custom:(uuid,encounterDatetime,diagnoses:(uuid,display,certainty,rank,voided))';
  const encountersApiUrl = `${restBaseUrl}/encounter?patient=${patientUuid}&v=${customRepresentation}`;

  const { data, error, isLoading, isValidating } = useSWR<{ data: EncounterResponse }, Error>(
    patientUuid ? encountersApiUrl : null,
    openmrsFetch,
  );

  const diagnoses =
    data?.data?.results
      ?.flatMap((encounter) =>
        (encounter.diagnoses ?? [])
          .filter((diagnosis) => !diagnosis.voided)
          .map((diagnosis) => ({
            id: diagnosis.uuid,
            display: diagnosis.display,
            certainty: diagnosis.certainty,
            rank: diagnosis.rank,
            encounterUuid: encounter.uuid,
            encounterDatetime: encounter.encounterDatetime,
          })),
      )
      .sort((a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime()) ?? null;

  return {
    diagnoses,
    error,
    isLoading,
    isValidating,
  };
}
