import { CONSULTATION_CONCEPT_UUIDS } from '../constants';
import { completedConsultationEncounter, pendingConsultationEncounter } from './consultation.fixture';
import { mapEncounterToConsultation } from './consultation.resource';
import {
  getUnreadConsultationResponses,
  isConsultationResponseUnread,
  markConsultationResponseSeen,
} from './consultation-review.resource';

const conceptUuids = { ...CONSULTATION_CONCEPT_UUIDS };
const providerUuid = 'requester-provider-uuid';
const storageKey = `consultation-seen-responses:${providerUuid}`;

describe('consultation-review.resource', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('treats completed consultations as unread for the requesting provider until seen', () => {
    const consultation = mapEncounterToConsultation(completedConsultationEncounter, conceptUuids);

    expect(isConsultationResponseUnread(consultation, providerUuid)).toBe(true);

    markConsultationResponseSeen(providerUuid, consultation.encounterUuid, consultation.respondedAt!);

    expect(localStorage.getItem(storageKey)).toContain(consultation.encounterUuid);
    expect(isConsultationResponseUnread(consultation, providerUuid)).toBe(false);
  });

  it('returns unread consultations only for the requesting provider', () => {
    const completed = mapEncounterToConsultation(completedConsultationEncounter, conceptUuids);
    const pending = mapEncounterToConsultation(pendingConsultationEncounter, conceptUuids);

    expect(getUnreadConsultationResponses([completed, pending], providerUuid)).toEqual([completed]);
    expect(getUnreadConsultationResponses([completed, pending], 'other-provider-uuid')).toEqual([]);
  });

  it('marks consultations unread again when a newer response timestamp is saved', () => {
    const consultation = mapEncounterToConsultation(completedConsultationEncounter, conceptUuids);

    markConsultationResponseSeen(providerUuid, consultation.encounterUuid, '2026-05-20T10:00:00.000+0000');

    expect(isConsultationResponseUnread(consultation, providerUuid)).toBe(true);
  });
});
