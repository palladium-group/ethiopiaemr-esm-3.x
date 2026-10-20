import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';

export interface PatientMatch {
  uuid: string;
  display: string;
  identifiers: Array<{ identifier: string; identifierType?: { display: string } }>;
  person: {
    gender: string | null;
    birthdate: string | null;
    preferredName: { givenName: string | null; middleName: string | null; familyName: string | null } | null;
    preferredAddress: {
      stateProvince: string | null;
      countyDistrict: string | null;
      cityVillage: string | null;
    } | null;
    attributes: Array<{ display: string; attributeType: { display: string } }>;
  };
}

const PATIENT_REP =
  'custom:(uuid,display,identifiers:(identifier,identifierType:(display)),person:(gender,birthdate,' +
  'preferredName:(givenName,middleName,familyName),preferredAddress:(stateProvince,countyDistrict,cityVillage),' +
  'attributes:(display,attributeType:(display))))';

export function usePatientSearch(query: string) {
  const q = query.trim();
  const { data, isLoading, error } = useSWR<FetchResponse<{ results: Array<PatientMatch> }>, Error>(
    q.length >= 2 ? `${restBaseUrl}/patient?q=${encodeURIComponent(q)}&limit=8&v=${PATIENT_REP}` : null,
    openmrsFetch,
  );
  return { matches: data?.data?.results ?? [], isLoading, error };
}

export function usePatient(uuid?: string | null) {
  const { data, isLoading } = useSWR<FetchResponse<PatientMatch>, Error>(
    uuid ? `${restBaseUrl}/patient/${uuid}?v=${PATIENT_REP}` : null,
    openmrsFetch,
  );
  return { patient: data?.data ?? null, isLoading };
}

/** Maps an OpenMRS patient onto the referral's demographic snapshot. */
export function demographicsFrom(p: PatientMatch) {
  const name = p.person.preferredName;
  const phone = p.person.attributes?.find((a) => /phone/i.test(a.attributeType?.display ?? ''));
  return {
    patientUuid: p.uuid,
    patientGivenName: name?.givenName ?? '',
    patientFatherName: name?.middleName ?? '',
    patientGrandfatherName: name?.familyName ?? '',
    patientGender: p.person.gender ?? '',
    patientBirthdate: p.person.birthdate ? p.person.birthdate.slice(0, 10) : '',
    patientMrn: p.identifiers?.[0]?.identifier ?? '',
    patientPhone: phone ? phone.display.split('=').pop()?.trim() ?? '' : '',
    patientRegion: p.person.preferredAddress?.stateProvince ?? '',
    patientZone: p.person.preferredAddress?.countyDistrict ?? '',
    patientWoreda: p.person.preferredAddress?.cityVillage ?? '',
  };
}
