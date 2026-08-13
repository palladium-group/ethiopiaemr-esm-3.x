import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface AdmitToInpatientRequest {
  patientUuid: string;
  wardLocationUuid: string;
  sourceVisitUuid?: string;
  admissionDatetime?: string;
  bedId?: number;
  copyVisitAttributes?: boolean;
}

export interface AdmitToInpatientResult {
  endedVisitUuid?: string | null;
  inpatientVisitUuid: string;
  admissionEncounterUuid: string;
}

interface AdmitToInpatientErrorBody {
  message?: string;
}

export class AdmitToInpatientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdmitToInpatientError';
    this.status = status;
  }
}

export async function admitToInpatient(request: AdmitToInpatientRequest): Promise<AdmitToInpatientResult> {
  try {
    const response = await openmrsFetch<AdmitToInpatientResult>(`${restBaseUrl}/ethiopiaemrcore/admit-to-inpatient`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        copyVisitAttributes: true,
        ...request,
      },
    });

    return response.data;
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      responseStatus?: number;
      responseBody?: AdmitToInpatientErrorBody & { error?: { message?: string } };
    };
    const message =
      err.responseBody?.message ||
      err.responseBody?.error?.message ||
      err.message ||
      (err.responseStatus === 409
        ? 'Patient already has an active inpatient admission'
        : 'Failed to admit patient to inpatient');
    throw new AdmitToInpatientError(message, err.responseStatus ?? 500);
  }
}
