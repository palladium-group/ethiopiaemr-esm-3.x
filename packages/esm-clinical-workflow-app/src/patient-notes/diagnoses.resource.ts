import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface EncounterDiagnosis {
  uuid: string;
  display: string;
  certainty: string;
  rank: number;
  voided: boolean;
  diagnosis?: {
    coded?: {
      uuid: string;
      display?: string;
    };
  };
}

interface EncounterWithDiagnoses {
  uuid: string;
  encounterDatetime: string;
  diagnoses: Array<EncounterDiagnosis>;
  obs?: Array<{
    uuid: string;
    concept: {
      uuid: string;
    };
    value?: string | number | boolean | object;
  }>;
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
  codedUuid?: string;
  encounterObs?: Array<{
    uuid: string;
    concept: {
      uuid: string;
    };
    value?: string | number | boolean | object;
  }>;
}

export function usePatientDiagnoses(patientUuid: string) {
  const customRepresentation =
    'custom:(uuid,encounterDatetime,diagnoses:(uuid,display,certainty,rank,voided,diagnosis:(coded:(uuid,display))),obs:(uuid,concept:(uuid),value))';
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
            codedUuid: diagnosis.diagnosis?.coded?.uuid,
            encounterObs: encounter.obs ?? [],
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
