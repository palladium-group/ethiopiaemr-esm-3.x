export type ConsultationStatus = 'pending' | 'completed';

export interface ConsultationProvider {
  uuid: string;
  display: string;
}

export interface ConsultationLocation {
  uuid: string;
  display: string;
}

export interface ConsultationRequestContent {
  reason: string;
  pertinentInvestigation: string;
  briefHistory: string;
}

export interface ConsultationResponseContent {
  briefFinding: string;
  recommendation: string;
}

export interface ConsultationThread {
  encounterUuid: string;
  patientUuid: string;
  patientDisplay: string;
  status: ConsultationStatus;
  consultationType: string;
  consultingDepartment: string;
  consultedDepartment: ConsultationLocation;
  requestingProvider?: ConsultationProvider;
  consultedProvider?: ConsultationProvider;
  requestedAt: string;
  respondedAt?: string;
  request: ConsultationRequestContent;
  response?: ConsultationResponseContent;
}
