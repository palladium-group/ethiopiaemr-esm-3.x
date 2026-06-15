import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface ConceptName {
  uuid: string;
  display: string;
  conceptNameType?: string;
}

interface CommonConfigProps {
  uuid: string;
  display: string;
}

interface ConceptWithNames {
  uuid: string;
  display: string;
  names?: Array<ConceptName>;
}

interface OrderConfig {
  drugRoutes: Array<CommonConfigProps>;
  drugDosingUnits: Array<CommonConfigProps>;
  orderFrequencies: Array<CommonConfigProps>;
}

export interface OrderConfigOption {
  uuid: string;
  display: string;
}

function getShortConceptName(names?: Array<ConceptName>) {
  return names?.find((name) => name.conceptNameType === 'SHORT')?.display;
}

export function useOrderConfigOptions() {
  const { data, error, isLoading } = useSWRImmutable<{ data: OrderConfig }, Error>(
    `${restBaseUrl}/orderentryconfig`,
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

  const { data: dosingUnitConceptData, isLoading: isLoadingDosingUnitConcepts } = useSWRImmutable(
    drugDosingUnitUuids.length ? ['orders-admin-drug-dosing-unit-concepts', ...drugDosingUnitUuids] : null,
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

  return useMemo(
    () => ({
      drugRoutes: data?.data?.drugRoutes ?? [],
      drugDosingUnits:
        data?.data?.drugDosingUnits?.map((unit) => ({
          uuid: unit.uuid,
          display: dosingUnitDisplayByUuid.get(unit.uuid) ?? unit.display,
        })) ?? [],
      orderFrequencies: data?.data?.orderFrequencies ?? [],
      error,
      isLoading: isLoading || isLoadingDosingUnitConcepts,
    }),
    [data, dosingUnitDisplayByUuid, error, isLoading, isLoadingDosingUnitConcepts],
  );
}
