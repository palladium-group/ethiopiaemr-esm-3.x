import type { KeyedMutator } from 'swr';
import { CONSULTATIONS_INBOX_SWR_KEY } from '../constants';

export function getConsultationsInboxSwrKey(sessionLocationUuid: string, consultationEncounterTypeUuid: string) {
  return [CONSULTATIONS_INBOX_SWR_KEY, sessionLocationUuid, consultationEncounterTypeUuid] as const;
}

export async function revalidateConsultationsInbox(globalMutate: KeyedMutator<unknown>) {
  await globalMutate((key) => Array.isArray(key) && key[0] === CONSULTATIONS_INBOX_SWR_KEY);
}

export async function revalidatePatientConsultations(globalMutate: KeyedMutator<unknown>, patientUuid: string) {
  await globalMutate(
    (key) => typeof key === 'string' && key.includes(`patient=${patientUuid}`) && key.includes('encounterType='),
  );
}
