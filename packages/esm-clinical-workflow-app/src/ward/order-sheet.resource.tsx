import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig, type Encounter, type Obs } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';

export interface OrderSheet {
  id: string;
  encounterUuid: string;
  date: string;
  nonDrugOrder: string;
  patientCondition: string;
  diet: string;
  ambulation: string;
}

const orderSheetFieldDisplay = {
  nonDrugOrder: 'Other(non drug) orders',
  patientCondition: 'Patient Condition',
  diet: 'Diet',
  ambulation: 'Ambulation',
};

function getObsValue(observation: Obs): string {
  if (!observation?.value) {
    return '';
  }

  if (typeof observation.value === 'object') {
    return (observation.value as { display?: string }).display || String(observation.value);
  }

  return String(observation.value);
}

function flattenObs(observations: Obs[] | undefined): Array<Obs> {
  const flattened: Array<Obs> = [];

  for (const observation of observations ?? []) {
    flattened.push(observation);
    flattened.push(...flattenObs(observation.groupMembers));
  }

  return flattened;
}

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function findObsByConceptDisplay(observations: Obs[] | undefined, conceptDisplay: string): Obs | undefined {
  const target = normalize(conceptDisplay);

  return flattenObs(observations).find((observation) => normalize(observation.concept?.display) === target);
}

export function useOrderSheet(patientUuid: string | undefined) {
  const { inpatientOrderSheetFormUuid } = useConfig<ClinicalWorkflowConfig>();

  const customRepresentation =
    'custom:(uuid,encounterDatetime,obs:(uuid,concept:(uuid,display),value,obsDatetime,groupMembers:(uuid,concept:(uuid,display),value,obsDatetime)))';

  const encountersApiUrl = patientUuid
    ? `${restBaseUrl}/encounter?patient=${patientUuid}&form=${inpatientOrderSheetFormUuid}&order=desc&v=${customRepresentation}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Encounter[] } }, Error>(
    encountersApiUrl,
    openmrsFetch,
  );

  const orderSheet = useMemo(() => {
    if (!data?.data?.results) {
      return null;
    }

    return data.data.results
      .map((encounter, index) => {
        const nonDrugOrderObs = findObsByConceptDisplay(encounter.obs, orderSheetFieldDisplay.nonDrugOrder);
        const patientConditionObs = findObsByConceptDisplay(encounter.obs, orderSheetFieldDisplay.patientCondition);
        const dietObs = findObsByConceptDisplay(encounter.obs, orderSheetFieldDisplay.diet);
        const ambulationObs = findObsByConceptDisplay(encounter.obs, orderSheetFieldDisplay.ambulation);

        return {
          id: `${encounter.uuid}-${index}`,
          encounterUuid: encounter.uuid,
          date: encounter.encounterDatetime,
          nonDrugOrder: nonDrugOrderObs ? getObsValue(nonDrugOrderObs) : '',
          patientCondition: patientConditionObs ? getObsValue(patientConditionObs) : '',
          diet: dietObs ? getObsValue(dietObs) : '',
          ambulation: ambulationObs ? getObsValue(ambulationObs) : '',
        };
      })
      .filter(
        (order) =>
          order.nonDrugOrder.trim().length > 0 ||
          order.patientCondition.trim().length > 0 ||
          order.diet.trim().length > 0 ||
          order.ambulation.trim().length > 0,
      )
      .sort((orderA, orderB) => new Date(orderB.date).getTime() - new Date(orderA.date).getTime());
  }, [data]);

  return {
    orderSheet,
    error,
    isLoading,
    isValidating,
    mutateOrderSheet: mutate,
  };
}
