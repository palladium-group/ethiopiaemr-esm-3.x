import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { useQueues } from './queue-entries.resource';
import type { QueueEntry } from '../types';

export interface QueueRoom {
  uuid: string;
  display: string;
  name: string;
  description?: string;
}

export interface TicketAssignment {
  status: string;
  ticketNumber: string;
}

export type ActiveTicketAssignments = Record<string, TicketAssignment>;

const queueRoomRepresentation = 'custom:(uuid,display,name,description,queue:(uuid,display))';

export function getVisitQueueNumber(
  queueEntry: QueueEntry,
  visitQueueNumberAttributeUuid: string | undefined,
): string | undefined {
  if (!visitQueueNumberAttributeUuid) {
    return undefined;
  }

  const value = queueEntry.visit?.attributes?.find(
    (attr) => attr.attributeType?.uuid === visitQueueNumberAttributeUuid,
  )?.value;

  return value != null ? String(value) : undefined;
}

export function findAssignedRoomName(
  ticketNumber: string | undefined,
  activeTickets: ActiveTicketAssignments | undefined,
): string | undefined {
  if (!ticketNumber || !activeTickets) {
    return undefined;
  }

  return Object.entries(activeTickets).find(
    ([, assignment]) => String(assignment.ticketNumber) === String(ticketNumber),
  )?.[0];
}

export function useActiveTicketAssignments() {
  const { data, error, isLoading, mutate } = useSWR<{ data: ActiveTicketAssignments }>(
    `${restBaseUrl}/queueutil/active-tickets`,
    openmrsFetch,
    { refreshInterval: 5000 },
  );

  return {
    activeTickets: data?.data,
    isLoading,
    error,
    mutate,
  };
}

export function useQueueRooms(queueUuid: string | undefined, locationUuid: string | undefined) {
  const searchParams = new URLSearchParams();
  searchParams.append('v', queueRoomRepresentation);
  if (queueUuid) {
    searchParams.append('queue', queueUuid);
  }
  if (locationUuid) {
    searchParams.append('location', locationUuid);
  }

  const apiUrl = queueUuid && locationUuid ? `${restBaseUrl}/queue-room?${searchParams.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<{ data: { results: Array<QueueRoom> } }>(apiUrl, openmrsFetch);

  return {
    queueRooms: data?.data?.results ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useServiceQueuesConfig() {
  return useConfig<{ visitQueueNumberAttributeUuid: string }>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });
}

export function useQueueRoomsAtLocation(locationUuid: string | undefined) {
  const { queues, isLoading: isLoadingQueues } = useQueues(locationUuid);
  const swrKey =
    locationUuid && queues.length > 0
      ? ['queue-rooms-at-location', locationUuid, queues.map((queue) => queue.uuid).join(',')]
      : null;

  const { data, error, isLoading, mutate } = useSWR<Array<QueueRoom>>(
    swrKey,
    async () => {
      const roomLists = await Promise.all(
        queues.map(async (queue) => {
          const searchParams = new URLSearchParams();
          searchParams.append('v', queueRoomRepresentation);
          searchParams.append('queue', queue.uuid);
          searchParams.append('location', locationUuid);
          const response = await openmrsFetch<{ results: Array<QueueRoom> }>(
            `${restBaseUrl}/queue-room?${searchParams.toString()}`,
          );
          return response.data?.results ?? [];
        }),
      );

      const roomsByName = new Map<string, QueueRoom>();
      roomLists.flat().forEach((room) => {
        if (!roomsByName.has(room.name)) {
          roomsByName.set(room.name, room);
        }
      });

      return Array.from(roomsByName.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    { revalidateOnFocus: false },
  );

  return {
    queueRooms: data ?? [],
    isLoading: isLoadingQueues || isLoading,
    error,
    mutate,
  };
}

export function filterQueueEntriesByRoom(
  queueEntries: Array<QueueEntry>,
  selectedRoomName: string | undefined,
  visitQueueNumberAttributeUuid: string | undefined,
  activeTickets: ActiveTicketAssignments | undefined,
): Array<QueueEntry> {
  if (!selectedRoomName || selectedRoomName === ALL_ROOMS_FILTER) {
    return queueEntries;
  }

  return queueEntries.filter((queueEntry) => {
    const ticketNumber = getVisitQueueNumber(queueEntry, visitQueueNumberAttributeUuid);
    const assignedRoomName = findAssignedRoomName(ticketNumber, activeTickets);

    if (selectedRoomName === UNASSIGNED_ROOM_FILTER) {
      return !assignedRoomName;
    }

    return assignedRoomName === selectedRoomName;
  });
}

export const ALL_ROOMS_FILTER = '__all_rooms__';
export const UNASSIGNED_ROOM_FILTER = '__unassigned_room__';

export async function assignPatientToQueueRoom(servicePointName: string, ticketNumber: string, status = 'waiting') {
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
