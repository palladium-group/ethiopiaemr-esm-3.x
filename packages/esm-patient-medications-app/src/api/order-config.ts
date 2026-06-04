import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  type DosingUnit,
  type DurationUnit,
  type MedicationFrequency,
  type MedicationRoute,
  type QuantityUnit,
} from '@openmrs/esm-patient-common-lib';

export interface ConceptName {
  uuid: string;
  display: string;
  conceptNameType?: string;
}

export interface CommonConfigProps {
  uuid: string;
  display: string;
  frequencyPerDay?: number;
  concept?: {
    names: ConceptName[];
  };
}

interface ConceptWithNames {
  uuid: string;
  display: string;
  names?: Array<ConceptName>;
}

function getShortConceptName(names?: Array<ConceptName>) {
  return names?.find((name) => name.conceptNameType === 'SHORT')?.display;
}

export interface OrderConfig {
  drugRoutes: Array<CommonConfigProps>;
  drugDosingUnits: Array<CommonConfigProps>;
  drugDispensingUnits: Array<CommonConfigProps>;
  durationUnits: Array<CommonConfigProps>;
  orderFrequencies: Array<CommonConfigProps>;
}

export function useOrderConfig(): {
  isLoading: boolean;
  error: Error;
  orderConfigObject: {
    drugRoutes: Array<MedicationRoute>;
    drugDosingUnits: Array<DosingUnit>;
    drugDispensingUnits: Array<QuantityUnit>;
    durationUnits: Array<DurationUnit>;
    orderFrequencies: Array<MedicationFrequency>;
  };
} {
  const { data, error, isLoading } = useSWRImmutable<{ data: OrderConfig }, Error>(
    `${restBaseUrl}/orderentryconfig`,
    openmrsFetch,
  );
  const {
    data: frequencyData,
    error: frequencyError,
    isLoading: frequencyLoading,
  } = useSWRImmutable<{ data: OrderConfig }, Error>(
    `${restBaseUrl}/orderentryconfig?v=custom:(uuid,display,frequencyPerDay,concept:(names:(display,uuid)))`,
    openmrsFetch,
  );
  const drugDosingUnitUuids = useMemo(
    () =>
      data?.data?.drugDosingUnits
        ?.map(({ uuid }) => uuid)
        .filter(Boolean)
        .sort() ?? [],
    [data?.data?.drugDosingUnits],
  );
  const { data: dosingUnitConceptData } = useSWRImmutable(
    drugDosingUnitUuids.length ? ['drug-dosing-unit-concepts', ...drugDosingUnitUuids] : null,
    ([, ...uuids]: Array<string>) =>
      Promise.all(
        uuids.map((uuid) =>
          openmrsFetch<ConceptWithNames>(
            `${restBaseUrl}/concept/${uuid}?v=custom:(uuid,display,names:(display,uuid,conceptNameType))`,
          ),
        ),
      ),
  );
  const dosingUnitDisplayByUuid = useMemo(
    () =>
      new Map(
        dosingUnitConceptData?.map(({ data: concept }) => [
          concept.uuid,
          getShortConceptName(concept.names) ?? concept.display,
        ]),
      ),
    [dosingUnitConceptData],
  );

  const results = useMemo(
    () => ({
      orderConfigObject: {
        drugRoutes: data?.data?.drugRoutes?.map(({ uuid, display }) => ({
          valueCoded: uuid,
          value: display,
        })),
        drugDosingUnits: data?.data?.drugDosingUnits?.map((unit) => ({
          valueCoded: unit.uuid,
          value: dosingUnitDisplayByUuid.get(unit.uuid) ?? unit.display,
        })),
        drugDispensingUnits: data?.data?.drugDispensingUnits?.map(({ uuid, display }) => ({
          valueCoded: uuid,
          value: display,
        })),
        durationUnits: data?.data?.durationUnits?.map(({ uuid, display }) => ({
          valueCoded: uuid,
          value: display,
        })),
        orderFrequencies: frequencyData?.data?.orderFrequencies?.map(({ uuid, display, frequencyPerDay, concept }) => ({
          valueCoded: uuid,
          value: display,
          frequencyPerDay: frequencyPerDay ?? null,
          names: concept.names.map((name) => name.display),
        })),
      },
      isLoading: isLoading || frequencyLoading,
      error: error || frequencyError,
    }),
    [data, error, isLoading, frequencyData, frequencyError, frequencyLoading, dosingUnitDisplayByUuid],
  );
  return results;
}
