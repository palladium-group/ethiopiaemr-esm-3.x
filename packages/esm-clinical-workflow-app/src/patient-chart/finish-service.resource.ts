import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';

const queueEntryRep =
  'custom:(uuid,display,queue,status,patient:(uuid,display),visit:(uuid,display),priority,priorityComment,sortWeight,startedAt,endedAt,locationWaitingFor,queueComingFrom,providerWaitingFor)';

function getActiveQueueEntryUrl(patientUuid: string) {
  const searchParams = new URLSearchParams({
    v: queueEntryRep,
    patient: patientUuid,
    isEnded: 'false',
  });
  return `${restBaseUrl}/queue-entry?${searchParams.toString()}`;
}

export function isFinishedServiceStatus(
  queueEntry: QueueEntry | undefined,
  finishedServiceQueueStatusUuid: string,
): boolean {
  if (!queueEntry?.status) {
    return false;
  }

  if (queueEntry.status.uuid === finishedServiceQueueStatusUuid) {
    return true;
  }

  return queueEntry.status.display?.trim().toLowerCase() === 'finished service';
}

function selectActiveQueueEntry(
  results: Array<QueueEntry> | undefined,
  finishedServiceQueueStatusUuid: string,
  visitUuid?: string,
) {
  if (!results?.length) {
    return undefined;
  }

  const activeEntries = results.filter(
    (entry) => !entry.endedAt && !isFinishedServiceStatus(entry, finishedServiceQueueStatusUuid),
  );
  if (!activeEntries.length) {
    return undefined;
  }

  if (visitUuid) {
    const visitEntry = activeEntries.find((entry) => entry.visit?.uuid === visitUuid);
    if (visitEntry) {
      return visitEntry;
    }
  }

  return activeEntries[0];
}

export function useActiveQueueEntry(
  patientUuid: string | undefined,
  finishedServiceQueueStatusUuid: string,
  visitUuid?: string,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    patientUuid ? getActiveQueueEntryUrl(patientUuid) : null,
    openmrsFetch<{ results: Array<QueueEntry> }>,
  );

  const queueEntry = useMemo(
    () => selectActiveQueueEntry(data?.data?.results, finishedServiceQueueStatusUuid, visitUuid),
    [data?.data?.results, finishedServiceQueueStatusUuid, visitUuid],
  );

  return {
    queueEntry,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function finishQueueService(queueEntry: QueueEntry, finishedServiceStatusUuid: string) {
  return openmrsFetch(`${restBaseUrl}/queue-entry/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      queueEntryToTransition: queueEntry.uuid,
      newQueue: queueEntry.queue.uuid,
      newStatus: finishedServiceStatusUuid,
      newPriority: queueEntry.priority.uuid,
      newPriorityComment: queueEntry.priorityComment ?? '',
    },
  });
}
