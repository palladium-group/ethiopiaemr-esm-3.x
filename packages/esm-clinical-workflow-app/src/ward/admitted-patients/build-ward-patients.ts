import { bedLayoutToBed } from './admitted-patients.utils';
import type { WardAppConfigSlice, WardPatient, WardPatientGroupDetails } from './ward.types';

export function buildWardPatients(
  wardPatientGroupDetails: WardPatientGroupDetails | undefined,
  config: WardAppConfigSlice,
): WardPatient[] {
  const { bedLayouts, wardAdmittedPatientsWithBed } = wardPatientGroupDetails ?? {};

  return (
    bedLayouts
      ?.map((bedLayout) => {
        const { patients } = bedLayout;
        const bed = bedLayoutToBed(bedLayout);
        const wardPatients: WardPatient[] = patients.map((patient): WardPatient => {
          const inpatientAdmission = wardAdmittedPatientsWithBed?.get(patient.uuid);
          if (inpatientAdmission) {
            const { patient, visit, currentInpatientRequest } = inpatientAdmission;
            return { patient, visit, bed, inpatientAdmission, inpatientRequest: currentInpatientRequest || null };
          }

          return {
            patient,
            visit: null,
            bed,
            inpatientAdmission: null,
            inpatientRequest: null,
          };
        });
        return wardPatients;
      })
      ?.flat() ?? []
  ).filter((pat) => {
    const ipdDischargeEncounter = pat?.visit?.encounters?.find(
      (encounter) => encounter.encounterType?.uuid === config.ipdDischargeEncounterTypeUuid,
    );
    return !ipdDischargeEncounter;
  });
}

export function getExchangeCandidates(wardPatients: WardPatient[], sourcePatientUuid: string): WardPatient[] {
  const source = wardPatients.find((wardPatient) => wardPatient.patient.uuid === sourcePatientUuid);
  if (!source?.visit) {
    return [];
  }

  return wardPatients.filter(
    (candidate) =>
      candidate.patient.uuid !== sourcePatientUuid && candidate.visit && candidate.bed.id !== source.bed.id,
  );
}
