import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, useConfig, formatTime, parseDate, restBaseUrl } from '@openmrs/esm-framework';
import { type PatientVitals } from '@openmrs/esm-service-queues-app/src/types/index';
import { type ConfigObject } from '@openmrs/esm-service-queues-app/src/config-schema';

interface VitalsObs {
  concept?: { uuid?: string };
  value?: unknown;
  obsDatetime?: string;
}

interface VitalsEncounter {
  encounterDatetime?: string;
  encounterProviders?: Array<{
    provider?: { display?: string; person?: { display?: string } };
    encounterRole?: { display?: string };
  }>;
  obs?: Array<VitalsObs>;
}

export function useVitalsConceptMetadata() {
  const customRepresentation =
    'custom:(setMembers:(uuid,display,hiNormal,hiAbsolute,hiCritical,lowNormal,lowAbsolute,lowCritical,units))';

  const apiUrl = `${restBaseUrl}/concept/?q=VITALS SIGNS&v=${customRepresentation}`;

  const { data, error, isLoading } = useSWRImmutable<{ data: VitalsConceptMetadataResponse }, Error>(
    apiUrl,
    openmrsFetch,
  );

  const conceptMetadata = data?.data?.results[0]?.setMembers;

  const conceptUnits = conceptMetadata?.length
    ? new Map<string, string>(conceptMetadata.map((concept) => [concept.uuid, concept.units]))
    : new Map<string, string>([]);
  return {
    data: conceptUnits,
    error,
    isLoading,
    conceptMetadata,
  };
}

export const withUnit = (label: string, unit: string | null | undefined) => {
  return `${label} ${unit ? `(${unit})` : ''}`;
};

export interface ConceptMetadata {
  uuid: string;
  display: string;
  hiNormal: number | string | null;
  hiAbsolute: number | string | null;
  hiCritical: number | string | null;
  lowNormal: number | string | null;
  lowAbsolute: number | string | null;
  lowCritical: number | string | null;
  units: string | null;
}

interface VitalsConceptMetadataResponse {
  results: Array<{
    setMembers: Array<ConceptMetadata>;
  }>;
}

const compareDatesAsc = (a?: string, b?: string): number => {
  if (!a || !b) {
    return 0;
  }
  const timeA = parseDate(a).getTime();
  const timeB = parseDate(b).getTime();
  return Number.isNaN(timeA) || Number.isNaN(timeB) ? 0 : timeA - timeB;
};

type VitalNumericField =
  | 'pulse'
  | 'oxygenSaturation'
  | 'respiratoryRate'
  | 'temperature'
  | 'systolic'
  | 'diastolic'
  | 'weight'
  | 'height';

export const useVitalsFromObs = (encounters: Array<VitalsEncounter> = []) => {
  const config = useConfig<ConfigObject>({ externalModuleName: '@openmrs/esm-service-queues-app' });

  const conceptFieldMap = new Map<string, VitalNumericField>([
    [config.concepts.pulseUuid, 'pulse'],
    [config.concepts.oxygenSaturationUuid, 'oxygenSaturation'],
    [config.concepts.respiratoryRateUuid, 'respiratoryRate'],
    [config.concepts.temperatureUuid, 'temperature'],
    [config.concepts.systolicBloodPressureUuid, 'systolic'],
    [config.concepts.diastolicBloodPressureUuid, 'diastolic'],
    [config.concepts.weightUuid, 'weight'],
    [config.concepts.heightUuid, 'height'],
  ]);

  const vitals: Array<PatientVitals> = [];

  // Sort oldest -> newest so Vitals' Object.assign merge ends with the latest readings.
  const sortedEncounters = [...(encounters ?? [])].sort((a, b) =>
    compareDatesAsc(a.encounterDatetime, b.encounterDatetime),
  );

  sortedEncounters.forEach((enc) => {
    const sortedObs = [...(enc.obs ?? [])].sort((a, b) => compareDatesAsc(a.obsDatetime, b.obsDatetime));
    const firstProvider = enc.encounterProviders?.[0];
    const provider = {
      name: firstProvider?.provider?.person?.display ?? firstProvider?.provider?.display ?? '',
      role: firstProvider?.encounterRole?.display ?? '',
    };

    sortedObs.forEach((obs: VitalsObs) => {
      const field = obs.concept?.uuid ? conceptFieldMap.get(obs.concept.uuid) : undefined;
      if (!field) {
        return;
      }
      const recordedAt = obs.obsDatetime ?? enc.encounterDatetime;
      vitals.push({
        [field]: obs.value,
        provider,
        time: recordedAt ? formatTime(parseDate(recordedAt)) : '',
      });
    });
  });

  return vitals;
};
