import { useCallback, useState } from 'react';
import { useSession } from '@openmrs/esm-framework';
import {
  getUnreadConsultationResponses,
  markConsultationResponseSeen,
} from '../resources/consultation-review.resource';
import type { ConsultationThread } from '../types/consultation.types';
import { useConsultationsByPatient } from './useConsultationsByPatient';

export function useConsultationsAwaitingReview(patientUuid: string | undefined) {
  const session = useSession();
  const providerUuid = session?.currentProvider?.uuid;
  const { consultations } = useConsultationsByPatient(patientUuid);
  const [, setSeenRevision] = useState(0);

  const unreadConsultations =
    consultations?.length && providerUuid ? getUnreadConsultationResponses(consultations, providerUuid) : [];

  const markConsultationSeen = useCallback(
    (consultation: ConsultationThread) => {
      if (!providerUuid || consultation.status !== 'completed' || !consultation.respondedAt) {
        return;
      }

      markConsultationResponseSeen(providerUuid, consultation.encounterUuid, consultation.respondedAt);
      setSeenRevision((currentRevision) => currentRevision + 1);
    },
    [providerUuid],
  );

  return {
    unreadConsultations,
    unreadCount: unreadConsultations.length,
    unreadEncounterUuids: unreadConsultations.map((consultation) => consultation.encounterUuid),
    markConsultationSeen,
  };
}
