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
  attributes?: Array<{
    uuid?: string;
    attributeType?: { uuid?: string; display?: string } | string;
    value?: unknown;
  }>;
}

interface EncounterWithDiagnoses {
  uuid: string;
  encounterDatetime: string;
  visit?: {
    uuid: string;
  };
  location?: {
    display?: string;
  };
  encounterProviders?: Array<{
    provider?: {
      person?: {
        display?: string;
      };
    };
  }>;
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
  visitUuid?: string;
  codedUuid?: string;
  attributes?: EncounterDiagnosis['attributes'];
  encounterObs?: Array<{
    uuid: string;
    concept: {
      uuid: string;
    };
    value?: string | number | boolean | object;
  }>;
  encounterProvider?: string;
  encounterLocation?: string;
}

export function usePatientDiagnoses(patientUuid: string) {
  const customRepresentation =
    'custom:(uuid,encounterDatetime,visit:(uuid),location:(display),encounterProviders:(provider:(person:(display))),diagnoses:(uuid,display,certainty,rank,voided,diagnosis:(coded:(uuid,display)),attributes:(uuid,attributeType:(uuid,display),value)),obs:(uuid,concept:(uuid),value))';
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
            visitUuid: encounter.visit?.uuid,
            codedUuid: diagnosis.diagnosis?.coded?.uuid,
            attributes: diagnosis.attributes,
            encounterObs: encounter.obs ?? [],
            encounterProvider: encounter.encounterProviders?.[0]?.provider?.person?.display,
            encounterLocation: encounter.location?.display,
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
