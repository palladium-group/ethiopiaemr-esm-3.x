import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface CommonConfigProps {
  uuid: string;
  display: string;
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

export function useOrderConfigOptions() {
  const { data, error, isLoading } = useSWRImmutable<{ data: OrderConfig }, Error>(
    `${restBaseUrl}/orderentryconfig`,
    openmrsFetch,
  );

  return useMemo(
    () => ({
      drugRoutes: data?.data?.drugRoutes ?? [],
      drugDosingUnits: data?.data?.drugDosingUnits ?? [],
      orderFrequencies: data?.data?.orderFrequencies ?? [],
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );
}
