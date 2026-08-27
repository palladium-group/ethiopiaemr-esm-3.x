import { useMemo } from 'react';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig, type Visit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';

const DUPLICATE_QUEUE_ENTRY_ERROR_CODE = '[queue.entry.duplicate.patient]';
const TRIAGE_VISIT_UUID_REPRESENTATION = 'custom:(uuid)';

type VisitAttributeLike = {
  uuid?: string;
  value?: unknown;
  attributeType?: {
    uuid?: string;
  };
};

export function buildTriageAssignmentCountUrl({
  triageAttributeTypeUuid,
  triageId,
  assignedQueueAttributeTypeUuid,
  queueLocationUuid,
  fromStartDate,
}: {
  triageAttributeTypeUuid: string;
  triageId: string;
  assignedQueueAttributeTypeUuid: string;
  queueLocationUuid: string;
  fromStartDate: string;
}): string {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('includeInactive', 'true');
  urlSearchParams.append('totalCount', 'true');
  urlSearchParams.append('fromStartDate', fromStartDate);
  urlSearchParams.append('attributeType', triageAttributeTypeUuid);
  urlSearchParams.append('attributeValue', triageId);
  urlSearchParams.append('attributeType', assignedQueueAttributeTypeUuid);
  urlSearchParams.append('attributeValue', queueLocationUuid);

  return `${restBaseUrl}/ethiopiaemrcustommodule/visit?v=${TRIAGE_VISIT_UUID_REPRESENTATION}&${urlSearchParams.toString()}`;
}

export function queueOptionLabel(name: string, count: number | undefined): string {
  return `${name} ${count ?? 0}`;
}

export async function fetchTriageAssignmentCountsByLocation(
  urlsByLocationUuid: Record<string, string>,
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    Object.entries(urlsByLocationUuid).map(async ([locationUuid, url]) => {
      const response = await openmrsFetch<{ totalCount?: number }>(url);
      return [locationUuid, response.data?.totalCount ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export function useTriageAssignmentCounts(triageId: string | undefined, queueLocationUuids: string[]) {
  const { triageVisitAttributeTypeUuid, assignedQueueVisitAttributeTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const fromStartDate = dayjs().startOf('day').toISOString();

  const urlsByLocationUuid = useMemo(() => {
    if (
      !triageId ||
      !triageVisitAttributeTypeUuid ||
      !assignedQueueVisitAttributeTypeUuid ||
      !queueLocationUuids.length
    ) {
      return {};
    }

    return Object.fromEntries(
      queueLocationUuids.map((queueLocationUuid) => [
        queueLocationUuid,
        buildTriageAssignmentCountUrl({
          triageAttributeTypeUuid: triageVisitAttributeTypeUuid,
          triageId,
          assignedQueueAttributeTypeUuid: assignedQueueVisitAttributeTypeUuid,
          queueLocationUuid,
          fromStartDate,
        }),
      ]),
    );
  }, [assignedQueueVisitAttributeTypeUuid, fromStartDate, queueLocationUuids, triageId, triageVisitAttributeTypeUuid]);

  const swrKey = Object.keys(urlsByLocationUuid).length ? ['triage-assignment-counts', urlsByLocationUuid] : null;

  const { data, isLoading } = useSWR(swrKey, ([, urls]: [string, Record<string, string>]) =>
    fetchTriageAssignmentCountsByLocation(urls),
  );

  return {
    byLocationUuid: data ?? {},
    isLoading: Boolean(swrKey) && isLoading,
  };
}

export async function setAssignedQueueVisitAttribute(
  visit: Visit,
  attributeTypeUuid: string,
  queueLocationUuid: string,
) {
  if (!visit?.uuid || !attributeTypeUuid || !queueLocationUuid) {
    return;
  }

  const attributes = visit.attributes as VisitAttributeLike[] | undefined;
  const existing = attributes?.find((attr) => attr.attributeType?.uuid === attributeTypeUuid);
  const existingValue = existing?.value == null ? undefined : String(existing.value);
  if (existingValue === queueLocationUuid) {
    return;
  }

  await openmrsFetch(`${restBaseUrl}/visit/${visit.uuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attributes: [
        {
          ...(existing?.uuid ? { uuid: existing.uuid } : {}),
          attributeType: attributeTypeUuid,
          value: queueLocationUuid,
        },
      ],
    }),
  });
}

export function isDuplicateQueueEntryError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const withBody = error as { message?: string; responseBody?: { error?: { message?: string } } };
  const errorMessage = withBody.responseBody?.error?.message || withBody.message || '';
  return errorMessage.includes(DUPLICATE_QUEUE_ENTRY_ERROR_CODE);
}

export function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  return (error as { message?: string }).message;
}

export async function postQueueEntry(
  visitUuid: string,
  queueUuid: string,
  patientUuid: string,
  priority: string,
  status: string,
  sortWeight: number,
  locationUuid: string,
  visitQueueNumberAttributeUuid?: string,
) {
  if (visitQueueNumberAttributeUuid) {
    await openmrsFetch(
      `${restBaseUrl}/queue-entry-number?location=${locationUuid}&queue=${queueUuid}&visit=${visitUuid}&visitAttributeType=${visitQueueNumberAttributeUuid}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  return openmrsFetch(`${restBaseUrl}/visit-queue-entry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      visit: { uuid: visitUuid },
      queueEntry: {
        status: { uuid: status },
        priority: { uuid: priority },
        queue: { uuid: queueUuid },
        patient: { uuid: patientUuid },
        startedAt: new Date(),
        sortWeight,
      },
    },
  });
}
