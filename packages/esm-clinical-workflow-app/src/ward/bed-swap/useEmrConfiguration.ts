import { type FetchResponse, openmrsFetch, type OpenmrsResource, restBaseUrl } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

interface EmrApiConfigurationResponse {
  bedAssignmentEncounterType: OpenmrsResource;
  clinicianEncounterRole: OpenmrsResource;
}

const customRep = 'custom:bedAssignmentEncounterType:(uuid),clinicianEncounterRole:(uuid)';

export function useEmrConfiguration() {
  const swrData = useSWRImmutable<FetchResponse<EmrApiConfigurationResponse>>(
    `${restBaseUrl}/emrapi/configuration?v=${customRep}`,
    openmrsFetch,
  );

  return useMemo(
    () => ({
      emrConfiguration: swrData.data?.data,
      isLoadingEmrConfiguration: swrData.isLoading,
      errorFetchingEmrConfiguration: swrData.error,
    }),
    [swrData.data?.data, swrData.error, swrData.isLoading],
  );
}
