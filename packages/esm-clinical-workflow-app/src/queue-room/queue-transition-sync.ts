import { getConfig, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { setAssignedQueueVisitAttribute } from '../triage/triage-queue-assignment.resource';
import { installQueueTransitionInterceptor, type QueueTransitionDetails } from './visit-save-interceptor';

const queueLocationCache = new Map<string, string>();

export function clearQueueLocationCache() {
  queueLocationCache.clear();
}

/**
 * Retrieves the location UUID associated with a queue.
 */
export async function getQueueLocationUuid(queueUuid: string): Promise<string | undefined> {
  if (!queueUuid) {
    return undefined;
  }
  const cached = queueLocationCache.get(queueUuid);
  if (cached) {
    return cached;
  }

  try {
    const { data } = await openmrsFetch<{ location?: { uuid?: string } }>(
      `${restBaseUrl}/queue/${queueUuid}?v=custom:(uuid,location:(uuid))`,
    );
    if (data?.location?.uuid) {
      queueLocationCache.set(queueUuid, data.location.uuid);
      return data.location.uuid;
    }
  } catch (error) {
    console.error(`[queue-transition-sync] Failed to fetch queue ${queueUuid} location:`, error);
  }
}

/**
 * Resolves the visit attribute type UUID that stores the assigned queue location.
 */
export async function getAssignedQueueAttributeTypeUuid(): Promise<string> {
  const config = await getConfig<ClinicalWorkflowConfig>('@palladium-ethiopia/esm-clinical-workflow-app').catch(
    () => null,
  );
  return config?.assignedQueueVisitAttributeTypeUuid ?? 'b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473';
}

const extractUuid = (val: unknown) => (typeof val === 'string' ? val : (val as { uuid?: string })?.uuid);

/**
 * Resolves the active visit or visit associated with the queue transition.
 */
export async function resolveVisitForQueueTransition(
  details: QueueTransitionDetails,
): Promise<{ uuid: string; attributes?: Array<unknown> } | undefined> {
  if (details.visitUuid) {
    return { uuid: details.visitUuid };
  }

  let patientUuid = details.patientUuid;
  if (!patientUuid && details.queueEntryToTransition) {
    try {
      const { data } = await openmrsFetch<{ patient?: unknown; visit?: unknown }>(
        `${restBaseUrl}/queue-entry/${details.queueEntryToTransition}?v=custom:(uuid,patient:(uuid),visit:(uuid))`,
      );
      const visitUuid = extractUuid(data?.visit);
      if (visitUuid) {
        return { uuid: visitUuid };
      }
      patientUuid = extractUuid(data?.patient);
    } catch (error) {
      console.warn(`[queue-transition-sync] Failed to fetch queue entry ${details.queueEntryToTransition}:`, error);
    }
  }

  if (patientUuid) {
    try {
      const { data } = await openmrsFetch<{ results?: Array<{ uuid: string }> }>(
        `${restBaseUrl}/visit?patient=${patientUuid}&includeInactive=false&v=custom:(uuid)`,
      );
      if (data?.results?.[0]?.uuid) {
        return data.results[0];
      }
    } catch (error) {
      console.warn(`[queue-transition-sync] Failed to fetch active visit for patient ${patientUuid}:`, error);
    }
  }
}

/**
 * Handles queue transition by persisting the new queue's location as the visit's Assigned Queue attribute.
 */
export async function syncQueueTransitionVisitAttribute(details: QueueTransitionDetails): Promise<void> {
  const { newQueue } = details;
  if (!newQueue) {
    return;
  }

  try {
    const queueLocationUuid = await getQueueLocationUuid(newQueue);
    if (!queueLocationUuid) {
      return;
    }

    const [visit, attributeTypeUuid] = await Promise.all([
      resolveVisitForQueueTransition(details),
      getAssignedQueueAttributeTypeUuid(),
    ]);

    if (!visit?.uuid || !attributeTypeUuid) {
      return;
    }

    await setAssignedQueueVisitAttribute(visit, attributeTypeUuid, queueLocationUuid);

    // Invalidate visit caches so patient scoreboard and other visit consumers update immediately
    mutate((key) => typeof key === 'string' && key.includes('/visit'));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('visit-updated'));
      window.dispatchEvent(new CustomEvent('queue-entry-updated'));
    }
  } catch (error) {
    console.error('[queue-transition-sync] Error updating visit attribute after queue transition:', error);
  }
}

let isSubscribed = false;

/**
 * Subscribes to queue transitions to keep the visit's assigned queue location attribute in sync.
 */
export function subscribeQueueTransitionSync(): () => void {
  if (isSubscribed) {
    return () => undefined;
  }
  isSubscribed = true;

  const uninstall = installQueueTransitionInterceptor(syncQueueTransitionVisitAttribute);

  return () => {
    uninstall();
    isSubscribed = false;
  };
}
