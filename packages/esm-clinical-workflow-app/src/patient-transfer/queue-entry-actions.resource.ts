import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export function removePatientFromQueue(queueEntryUuid: string) {
  return openmrsFetch(`${restBaseUrl}/queue-entry/${queueEntryUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      endedAt: new Date().toISOString(),
    },
  });
}
