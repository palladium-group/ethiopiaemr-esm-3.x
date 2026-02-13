export { useQueueLocations } from '@openmrs/esm-service-queues-app/src/create-queue-entry/hooks/useQueueLocations';
export { useQueues } from '@openmrs/esm-service-queues-app/src/hooks/useQueues';
export { useLatestQueueEntry } from '@openmrs/esm-service-queues-app/src/modals/add-or-move-modal/useLatestQueueEntry';

export { postQueueEntry } from '@openmrs/esm-service-queues-app/src/create-queue-entry/queue-fields/queue-fields.resource';

export async function createQueueEntry(
  visitUuid: string,
  queueUuid: string,
  patientUuid: string,
  priorityUuid: string,
  statusUuid: string,
  sortWeight: number,
  locationUuid: string,
  visitQueueNumberAttributeUuid?: string,
): Promise<any> {
  const { postQueueEntry } = await import(
    '@openmrs/esm-service-queues-app/src/create-queue-entry/queue-fields/queue-fields.resource'
  );

  return postQueueEntry(
    visitUuid,
    queueUuid,
    patientUuid,
    priorityUuid,
    statusUuid,
    sortWeight,
    locationUuid,
    visitQueueNumberAttributeUuid ?? '14d4f066-15f5-102d-96e4-000c29c2a5d7',
  );
}
