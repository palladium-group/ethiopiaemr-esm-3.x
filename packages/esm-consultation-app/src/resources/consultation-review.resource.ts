import { CONSULTATION_SEEN_RESPONSES_STORAGE_KEY_PREFIX } from '../constants';
import type { ConsultationThread } from '../types/consultation.types';

type SeenConsultationResponses = Record<string, string>;

function getStorageKey(providerUuid: string): string {
  return `${CONSULTATION_SEEN_RESPONSES_STORAGE_KEY_PREFIX}:${providerUuid}`;
}

function readSeenConsultationResponses(providerUuid: string): SeenConsultationResponses {
  if (!providerUuid || typeof localStorage === 'undefined') {
    return {};
  }

  try {
    const storedValue = localStorage.getItem(getStorageKey(providerUuid));
    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue) as SeenConsultationResponses;
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch {
    return {};
  }
}

function writeSeenConsultationResponses(providerUuid: string, seenResponses: SeenConsultationResponses) {
  if (!providerUuid || typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(getStorageKey(providerUuid), JSON.stringify(seenResponses));
}

export function markConsultationResponseSeen(
  providerUuid: string,
  encounterUuid: string,
  respondedAt: string,
): SeenConsultationResponses {
  const seenResponses = readSeenConsultationResponses(providerUuid);
  seenResponses[encounterUuid] = respondedAt;
  writeSeenConsultationResponses(providerUuid, seenResponses);
  return seenResponses;
}

export function isConsultationResponseUnread(
  consultation: ConsultationThread,
  providerUuid: string | undefined,
): boolean {
  if (
    consultation.status !== 'completed' ||
    !consultation.respondedAt ||
    !providerUuid ||
    consultation.requestingProvider?.uuid !== providerUuid
  ) {
    return false;
  }

  const seenAt = readSeenConsultationResponses(providerUuid)[consultation.encounterUuid];
  if (!seenAt) {
    return true;
  }

  return new Date(seenAt).getTime() < new Date(consultation.respondedAt).getTime();
}

export function getUnreadConsultationResponses(
  consultations: Array<ConsultationThread>,
  providerUuid: string | undefined,
): Array<ConsultationThread> {
  return consultations.filter((consultation) => isConsultationResponseUnread(consultation, providerUuid));
}
