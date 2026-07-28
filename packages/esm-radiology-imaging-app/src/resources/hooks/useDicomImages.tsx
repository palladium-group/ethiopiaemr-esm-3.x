import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

export type DicomStudyMainTags = {
  AccessionNumber: string;
  InstitutionName: string;
  ReferringPhysicianName: string;
  StudyDate: string;
  StudyDescription: string;
  StudyID: string;
  StudyInstanceUID: string;
  StudyTime: string;
};

export type DicomPatientMainTags = {
  PatientBirthDate: string;
  PatientID: string;
  PatientName: string;
  PatientSex: string;
};

export type DicomStudy = {
  uuid: string;
  stable: boolean;
  lastUpdate: string;
  mainDicomTags: DicomStudyMainTags;
  patientMainDicomTags: DicomPatientMainTags;
};

type DicomStudyResponse = {
  results: Array<DicomStudy>;
};

export function useDicomImages(accessionNumber: string) {
  const url = accessionNumber ? `${restBaseUrl}/dicomstudy?accessionNumber=${accessionNumber}` : null;

  const { data, error, isLoading } = useSWR<DicomStudyResponse>(url, (path: string) =>
    openmrsFetch<DicomStudyResponse>(path).then((res) => res.data),
  );

  return {
    studies: data?.results ?? [],
    isLoading,
    error,
  };
}
