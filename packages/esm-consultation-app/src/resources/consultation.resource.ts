import { restBaseUrl, type Encounter, type Obs } from '@openmrs/esm-framework';
import type { ConsultationConceptUuids } from '../config-schema';
import type { ConsultationProvider, ConsultationStatus, ConsultationThread } from '../types/consultation.types';

export const CONSULTATION_ENCOUNTER_REPRESENTATION =
  'custom:(uuid,encounterDatetime,patient:(uuid,display),location:(uuid,display),' +
  'obs:(uuid,concept:(uuid,display),value,obsDatetime),' +
  'encounterProviders:(uuid,encounterRole:(uuid,display),provider:(uuid,person:(uuid,display))),' +
  'form:(uuid,display),encounterType:(uuid,display),visit:(uuid))';

export function getConsultationsByPatientUrl(patientUuid: string, consultationEncounterTypeUuid: string): string {
  return `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${consultationEncounterTypeUuid}&order=desc&v=${CONSULTATION_ENCOUNTER_REPRESENTATION}`;
}

export function filterPendingConsultations(consultations: Array<ConsultationThread>): Array<ConsultationThread> {
  return consultations.filter((consultation) => consultation.status === 'pending');
}

export function canRespondToConsultation(
  consultation: ConsultationThread,
  sessionLocationUuid: string | undefined,
): boolean {
  return (
    consultation.status === 'pending' &&
    Boolean(sessionLocationUuid) &&
    consultation.consultedDepartment.uuid === sessionLocationUuid
  );
}

export function mapEncountersToConsultations(
  encounters: Array<Encounter> | undefined,
  conceptUuids: ConsultationConceptUuids,
): Array<ConsultationThread> {
  return (encounters ?? [])
    .map((encounter) => mapEncounterToConsultation(encounter, conceptUuids))
    .sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime());
}

export function getObsValue(observation: Obs | undefined): string {
  if (!observation?.value) {
    return '';
  }

  if (typeof observation.value === 'object') {
    return (observation.value as { display?: string }).display ?? String(observation.value);
  }

  return String(observation.value);
}

function getLatestObsValue(observations: Array<Obs> | undefined, conceptUuid: string): string {
  if (!observations?.length) {
    return '';
  }

  const matchingObs = observations
    .filter((observation) => observation.concept?.uuid === conceptUuid)
    .sort((left, right) => new Date(right.obsDatetime ?? 0).getTime() - new Date(left.obsDatetime ?? 0).getTime());

  return getObsValue(matchingObs[0]);
}

function getLatestObsDatetime(observations: Array<Obs> | undefined, conceptUuid: string): string | undefined {
  if (!observations?.length) {
    return undefined;
  }

  const matchingObs = observations
    .filter((observation) => observation.concept?.uuid === conceptUuid && observation.obsDatetime)
    .sort((left, right) => new Date(right.obsDatetime ?? 0).getTime() - new Date(left.obsDatetime ?? 0).getTime());

  return matchingObs[0]?.obsDatetime;
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getConsultationStatus(response: { briefFinding: string; recommendation: string }): ConsultationStatus {
  if (hasText(response.briefFinding) && hasText(response.recommendation)) {
    return 'completed';
  }

  return 'pending';
}

function mapEncounterProvider(
  encounterProvider: NonNullable<Encounter['encounterProviders']>[number],
): ConsultationProvider | undefined {
  const uuid = encounterProvider.provider?.uuid;
  const display = encounterProvider.provider?.person?.display;

  if (!uuid || !display) {
    return undefined;
  }

  return { uuid, display };
}

function getConsultedDepartment(
  encounter: Encounter,
  conceptUuids: ConsultationConceptUuids,
): ConsultationThread['consultedDepartment'] {
  if (encounter.location?.uuid) {
    return {
      uuid: encounter.location.uuid,
      display: encounter.location.display ?? '',
    };
  }

  const consultedDepartmentObsValue = getLatestObsValue(encounter.obs, conceptUuids.consultedDepartment);
  if (consultedDepartmentObsValue) {
    return {
      uuid: consultedDepartmentObsValue,
      display: consultedDepartmentObsValue,
    };
  }

  return {
    uuid: '',
    display: '',
  };
}

function getRespondedAt(
  observations: Array<Obs> | undefined,
  conceptUuids: ConsultationConceptUuids,
  status: ConsultationStatus,
): string | undefined {
  if (status !== 'completed') {
    return undefined;
  }

  const findingDatetime = getLatestObsDatetime(observations, conceptUuids.briefFinding);
  const recommendationDatetime = getLatestObsDatetime(observations, conceptUuids.recommendation);
  const datetimes = [findingDatetime, recommendationDatetime].filter(Boolean) as Array<string>;

  if (!datetimes.length) {
    return undefined;
  }

  return datetimes.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

export function mapEncounterToConsultation(
  encounter: Encounter,
  conceptUuids: ConsultationConceptUuids,
): ConsultationThread {
  const consultingDepartment = getLatestObsValue(encounter.obs, conceptUuids.consultingDepartment);
  const consultationType = getLatestObsValue(encounter.obs, conceptUuids.typeOfConsultation);
  const briefFinding = getLatestObsValue(encounter.obs, conceptUuids.briefFinding);
  const recommendation = getLatestObsValue(encounter.obs, conceptUuids.recommendation);
  const status = getConsultationStatus({ briefFinding, recommendation });
  const providers = (encounter.encounterProviders ?? [])
    .map(mapEncounterProvider)
    .filter((provider): provider is ConsultationProvider => Boolean(provider));
  const requestingProvider = providers[0];
  const consultedProvider = status === 'completed' && providers.length ? providers[providers.length - 1] : undefined;

  const request = {
    reason: getLatestObsValue(encounter.obs, conceptUuids.reasonForConsultation),
    pertinentInvestigation: getLatestObsValue(encounter.obs, conceptUuids.pertinentInvestigation),
    briefHistory: getLatestObsValue(encounter.obs, conceptUuids.briefHistory),
  };

  const response =
    status === 'completed'
      ? {
          briefFinding,
          recommendation,
        }
      : undefined;

  return {
    encounterUuid: encounter.uuid,
    patientUuid: encounter.patient?.uuid ?? '',
    patientDisplay: encounter.patient?.display ?? '',
    status,
    consultationType,
    consultingDepartment,
    consultedDepartment: getConsultedDepartment(encounter, conceptUuids),
    requestingProvider,
    consultedProvider,
    requestedAt: encounter.encounterDatetime,
    respondedAt: getRespondedAt(encounter.obs, conceptUuids, status),
    request,
    response,
  };
}
