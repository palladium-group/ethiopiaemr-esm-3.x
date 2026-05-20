import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';

export function mapVisitQueueEntryProperties(queueEntry: QueueEntry, visitQueueNumberAttributeUuid: string) {
  return {
    id: queueEntry.uuid,
    queue: queueEntry.queue,
    visitQueueNumber: queueEntry.visit?.attributes?.find(
      (attribute) => attribute?.attributeType?.uuid === visitQueueNumberAttributeUuid,
    )?.value as string | undefined,
  };
}

export function serveQueueEntry(servicePointName: string, ticketNumber: string, status: string) {
  return openmrsFetch(`${restBaseUrl}/queueutil/assignticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      servicePointName,
      ticketNumber,
      status,
    },
  });
}
