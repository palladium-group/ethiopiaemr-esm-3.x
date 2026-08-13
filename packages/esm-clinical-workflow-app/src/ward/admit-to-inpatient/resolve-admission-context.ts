import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import { omrsDateFormat } from '../../patient-chart/constants';
import type { WardPatient } from '../admitted-patients/ward.types';

const activeVisitRepresentation = 'custom:(uuid,startDatetime,stopDatetime,visitType:(uuid,name))';

export function resolveWardPatientVisit(wardPatient: WardPatient | undefined): Visit | undefined {
  if (!wardPatient) {
    return undefined;
  }

  return wardPatient.visit ?? wardPatient.inpatientRequest?.visit ?? wardPatient.inpatientAdmission?.visit ?? undefined;
}

export async function resolveSourceVisitUuid(
  wardPatient: WardPatient | undefined,
  patientUuid: string,
): Promise<string | undefined> {
  const wardVisit = resolveWardPatientVisit(wardPatient);
  if (wardVisit?.uuid) {
    return wardVisit.uuid;
  }

  const activeVisit = await fetchActiveVisit(patientUuid);
  return activeVisit?.uuid;
}

async function fetchActiveVisit(patientUuid: string): Promise<Visit | undefined> {
  const response = await openmrsFetch<{ results: Visit[] }>(
    `${restBaseUrl}/visit?patient=${patientUuid}&includeInactive=false&v=${activeVisitRepresentation}`,
  );

  return response.data?.results?.[0];
}

/**
 * Build an admission datetime that is after the source visit start and not in the future.
 * Carbon's date picker often zeroes the time component when a date is selected.
 */
export function buildAdmissionDatetime(admissionDate: Date, sourceVisitStartDatetime?: string): string {
  const now = dayjs();
  let datetime = dayjs(admissionDate);

  const isMidnightSelection =
    datetime.hour() === 0 && datetime.minute() === 0 && datetime.second() === 0 && datetime.millisecond() === 0;

  if (isMidnightSelection) {
    datetime = datetime.hour(now.hour()).minute(now.minute()).second(now.second()).millisecond(0);
  }

  if (sourceVisitStartDatetime) {
    const visitStart = dayjs(sourceVisitStartDatetime);
    if (datetime.isBefore(visitStart)) {
      datetime = visitStart.add(1, 'second');
    }
  }

  if (datetime.isAfter(now)) {
    datetime = now;
  }

  return datetime.format(omrsDateFormat);
}
