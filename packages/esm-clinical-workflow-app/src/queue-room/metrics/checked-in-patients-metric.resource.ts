import { openmrsFetch, restBaseUrl, useSession, type Visit } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWR from 'swr';

/**
 * Upstream metrics.resource uses dayjs().isToday(), which requires the isToday plugin
 * extended in service-queues.resource. That module is not loaded when the default
 * service-queues-dashboard root is removed from the slot.
 */
export function useCheckedInPatientsCount() {
  const currentUserSession = useSession();
  const startDate = dayjs().format('YYYY-MM-DD');
  const sessionLocation = currentUserSession?.sessionLocation?.uuid;
  const today = dayjs();

  const customRepresentation =
    'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),' +
    'visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,' +
    'stopDatetime)&fromStartDate=' +
    startDate +
    '&location=' +
    sessionLocation;
  const url = `${restBaseUrl}/visit?includeInactive=false&v=${customRepresentation}`;

  const { data, error, isLoading, isValidating } = useSWR<{ data: { results: Array<Visit> } }, Error>(
    sessionLocation ? url : null,
    openmrsFetch,
  );

  const uniquePatientUUIDs = new Set<string>();

  data?.data?.results.forEach((visit) => {
    const patientUUID = visit.patient?.uuid;
    const visitIsToday = dayjs(visit.startDatetime).isSame(today, 'day');
    if (patientUUID && visitIsToday) {
      uniquePatientUUIDs.add(patientUUID);
    }
  });

  return {
    activeVisitsCount: uniquePatientUUIDs.size,
    isLoading,
    error,
    isValidating,
  };
}
