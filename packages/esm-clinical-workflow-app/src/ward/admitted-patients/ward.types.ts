import type { Patient, Visit } from '@openmrs/esm-framework';
import type React from 'react';

export interface BedType {
  uuid: string;
  name: string;
  displayName: string;
  description: string;
  resourceVersion: string;
}

export type BedStatus = 'AVAILABLE' | 'OCCUPIED';

export interface Bed {
  id: number;
  uuid: string;
  bedNumber: string;
  bedType: BedType;
  row: number;
  column: number;
  status: BedStatus;
}

export interface BedLayout {
  rowNumber: number;
  columnNumber: number;
  bedNumber: string;
  bedId: number;
  bedUuid: string;
  status: BedStatus;
  bedType: BedType;
  location: string;
  patients: Patient[];
  bedTagMaps: Array<{
    uuid: string;
    bedTag: {
      id: number;
      name: string;
      uuid: string;
      resourceVersion: string;
    };
  }>;
}

export interface InpatientRequest {
  patient: Patient;
  visit: Visit;
}

export interface InpatientAdmission {
  patient: Patient;
  visit: Visit;
  encounterAssigningToCurrentInpatientLocation?: {
    encounterDatetime?: string;
  };
  currentInpatientRequest?: InpatientRequest | null;
}

export type WardPatient = {
  patient: Patient;
  visit: Visit | null;
  bed: Bed;
  inpatientAdmission: InpatientAdmission | null;
  inpatientRequest: InpatientRequest | null;
};

export interface WardPatientGroupDetails {
  bedLayouts?: BedLayout[];
  wardAdmittedPatientsWithBed?: Map<string, InpatientAdmission>;
  isLoading?: boolean;
}

export interface WardViewContext {
  wardPatientGroupDetails: WardPatientGroupDetails;
  WardPatientHeader: React.ComponentType<{ wardPatient: WardPatient }>;
}

export interface WardAppConfigSlice {
  ipdDischargeEncounterTypeUuid: string;
  inpatientDischargeFormUuid: string;
}
