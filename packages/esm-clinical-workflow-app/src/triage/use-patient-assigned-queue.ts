import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import {
  openmrsFetch,
  restBaseUrl,
  useConfig,
  useSession,
  type FetchResponse,
  type Visit,
} from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { useQueueLocations } from '../queue-room/queue-entries.resource';
import type { QueueEntry } from '../types';

export interface AssignedQueueInfo {
  displayQueue: string | null;
  isLoading: boolean;
}

const queueEntryRepresentation = 'custom:(startedAt,endedAt,queue:(name,display,location:(name,display)))';

export function usePatientAssignedQueue(
  patientUuid: string | undefined,
  activeVisit: Visit | null | undefined,
): AssignedQueueInfo {
  const config = useConfig<ClinicalWorkflowConfig>();
  const { queueLocations, isLoading: isLoadingQueueLocations } = useQueueLocations(config?.queueLocationTagName);
  const { sessionLocation } = useSession();

  const sessionLocationName = (sessionLocation as any)?.display || (sessionLocation as any)?.name;

  const shouldFetchQueueEntry = Boolean(patientUuid && activeVisit);
  const queueEntryUrl = shouldFetchQueueEntry
    ? `${restBaseUrl}/queue-entry?v=${encodeURIComponent(
        queueEntryRepresentation,
      )}&patient=${patientUuid}&isEnded=false`
    : null;

  const {
    data: queueEntryData,
    isLoading: isLoadingQueueEntry,
    mutate: mutateQueueEntry,
  } = useSWR<FetchResponse<{ results: QueueEntry[] }>>(queueEntryUrl, openmrsFetch);

  useEffect(() => {
    const handleQueueUpdate = () => mutateQueueEntry();
    window.addEventListener('queue-entry-updated', handleQueueUpdate);
    return () => window.removeEventListener('queue-entry-updated', handleQueueUpdate);
  }, [mutateQueueEntry]);

  const activeQueueEntry = useMemo(
    () =>
      queueEntryData?.data?.results
        ?.filter((e) => !e.endedAt)
        ?.reduce<QueueEntry | null>(
          (latest, curr) => (!latest || curr.startedAt > latest.startedAt ? curr : latest),
          null,
        ) ?? null,
    [queueEntryData],
  );

  const queueName = activeQueueEntry?.queue?.name || activeQueueEntry?.queue?.display || null;
  const queueLocationName =
    activeQueueEntry?.queue?.location?.name || activeQueueEntry?.queue?.location?.display || null;

  const assignedLocationFromVisit = useMemo(() => {
    const attr = (
      activeVisit?.attributes as Array<{ attributeType?: { uuid?: string }; value?: unknown }> | undefined
    )?.find((a) => a.attributeType?.uuid === config?.assignedQueueVisitAttributeTypeUuid);
    if (!attr?.value) {
      return null;
    }
    const locUuid = String(attr.value);
    return (
      queueLocations?.find((loc) => loc.id === locUuid)?.name ||
      (locUuid === sessionLocation?.uuid ? sessionLocationName : locUuid)
    );
  }, [
    activeVisit?.attributes,
    config?.assignedQueueVisitAttributeTypeUuid,
    queueLocations,
    sessionLocation?.uuid,
    sessionLocationName,
  ]);

  const resolvedLocationName = queueLocationName || assignedLocationFromVisit;

  const displayQueue =
    queueName && resolvedLocationName
      ? queueName.toLowerCase().includes(resolvedLocationName.toLowerCase())
        ? queueName
        : `${queueName} (${resolvedLocationName})`
      : queueName || resolvedLocationName || null;

  return {
    displayQueue,
    isLoading: (shouldFetchQueueEntry && isLoadingQueueEntry) || isLoadingQueueLocations,
  };
}
