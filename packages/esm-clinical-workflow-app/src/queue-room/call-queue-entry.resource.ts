import dayjs from 'dayjs';
import useSWR from 'swr';
import { formatDate, openmrsFetch, parseDate, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';

const callQueueEntryRep =
  'custom:(uuid,display,queue:(uuid,display,name,location:(uuid,display)),status:(uuid,display),patient:(uuid,display,person:(uuid,display,birthdate,gender,age),identifiers:(uuid,display,identifier,identifierType:(uuid,display))),visit:(uuid,display,visitType:(uuid,display),attributes:(uuid,display,value,attributeType:(uuid,display))),priority:(uuid,display),priorityComment,sortWeight,startedAt,endedAt,queueComingFrom:(uuid,display))';

export interface MappedCallQueueEntry {
  name: string;
  patientUuid: string;
  patientAge: string;
  patientGender: string;
  visitUuid: string;
  queueUuid: string;
  queueEntryUuid: string;
  sortWeight: number;
  visitQueueNumber?: string;
  queue: QueueEntry['queue'];
  priority?: QueueEntry['priority'];
  identifiers: NonNullable<QueueEntry['patient']>['identifiers'];
}

export function useCallQueueEntry(queueEntryUuid: string | undefined) {
  const apiUrl = queueEntryUuid ? `${restBaseUrl}/queue-entry/${queueEntryUuid}?v=${callQueueEntryRep}` : null;

  const { data, error, isLoading, isValidating } = useSWR<FetchResponse<QueueEntry>, Error>(apiUrl, openmrsFetch);

  return {
    queueEntry: data?.data,
    error,
    isLoading: isLoading || isValidating,
  };
}

export function mapCallQueueEntry(queueEntry: QueueEntry, visitQueueNumberAttributeUuid: string): MappedCallQueueEntry {
  const birthdate = queueEntry.patient?.person?.birthdate;
  const ageFromPerson = queueEntry.patient?.person?.age;
  const computedAge =
    ageFromPerson != null ? String(ageFromPerson) : birthdate ? String(dayjs().diff(dayjs(birthdate), 'year')) : '--';

  return {
    name: queueEntry.display ?? queueEntry.patient?.person?.display ?? queueEntry.patient?.display ?? '--',
    patientUuid: queueEntry.patient?.uuid ?? '',
    patientAge: computedAge,
    patientGender: queueEntry.patient?.person?.gender ?? '--',
    visitUuid: queueEntry.visit?.uuid ?? '',
    queueUuid: queueEntry.queue?.uuid ?? '',
    queueEntryUuid: queueEntry.uuid,
    sortWeight: queueEntry.sortWeight,
    visitQueueNumber: queueEntry.visit?.attributes?.find(
      (attribute) => attribute?.attributeType?.uuid === visitQueueNumberAttributeUuid,
    )?.value as string | undefined,
    queue: queueEntry.queue,
    priority: queueEntry.priority,
    identifiers: queueEntry.patient?.identifiers ?? [],
  };
}

export async function endQueueEntry(previousQueueUuid: string, queueEntryUuid: string, endedAt: Date) {
  return openmrsFetch(`${restBaseUrl}/queue/${previousQueueUuid}/entry/${queueEntryUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      endedAt,
    },
  });
}

export async function updateQueueEntryForCall(
  visitUuid: string,
  queueUuid: string,
  queueEntryUuid: string,
  patientUuid: string,
  priorityUuid: string | undefined,
  statusUuid: string,
  endedAt: Date,
  sortWeight: number,
) {
  await endQueueEntry(queueUuid, queueEntryUuid, endedAt);

  return openmrsFetch(`${restBaseUrl}/visit-queue-entry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      visit: { uuid: visitUuid },
      queueEntry: {
        status: { uuid: statusUuid },
        priority: { uuid: priorityUuid },
        queue: { uuid: queueUuid },
        patient: { uuid: patientUuid },
        startedAt: new Date(),
        sortWeight,
        queueComingFrom: queueUuid,
      },
    },
  });
}

export function requeueQueueEntry(priorityComment: string, queueUuid: string, queueEntryUuid: string) {
  return openmrsFetch(`${restBaseUrl}/queue/${queueUuid}/entry/${queueEntryUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      priorityComment,
    },
  });
}

export function formatPatientDob(queueEntry: QueueEntry): string {
  const birthdate = queueEntry.patient?.person?.birthdate;
  if (!birthdate) {
    return '--';
  }
  const parsed = parseDate(birthdate);
  return parsed ? formatDate(parsed, { time: false }) : '--';
}
