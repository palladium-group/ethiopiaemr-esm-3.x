import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

const BASE_URL = `${restBaseUrl}/ethiopia/autoclaim`;

export const AUTO_CLAIMS_SWR_KEY = BASE_URL;
export interface AutoClaimItem {
  uuid: string;
  claimReference: string;
  visitDate: string;
  patientName: string;
  patientUuid: string;
  gender: string;
  age: number;
  patientId: string;
  cbhiId: string | null;
  shiId: string | null;
  woreda: string | null;
  employerOrganization: string | null;
  serviceType: string | null;
  diagnosisCode: string | null;
  diagnosisName: string | null;
  services: {
    lab: string;
    imaging: string;
    procedure: string;
    medicine: string;
  };
  costs: {
    consultation: number | null;
    lab: number | null;
    imaging: number | null;
    procedure: number | null;
    medicine: number | null;
    foodBed: number | null;
    other: number | null;
    total: number | null;
  };
  providerName: string | null;
  facilityName: string | null;
  facilityUuid: string | null;
  status: string;
  batchReference: string | null;
  dateCreated: string;
}

export interface AutoClaimsResponse {
  total: number;
  page: number;
  size: number;
  results: AutoClaimItem[];
}

export interface ClaimEditPayload {
  visitDate?: string;
  cbhiId?: string;
  shiId?: string;
  woreda?: string;
  employerOrganization?: string;
  serviceType?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  labOrders?: string;
  imagingOrders?: string;
  procedureOrders?: string;
  medicineOrders?: string;
  consultationCost?: number;
  labCost?: number;
  imagingCost?: number;
  procedureCost?: number;
  medicineCost?: number;
  foodBedCost?: number;
  otherCost?: number;
  totalCost?: number;
  claimReference?: string;
  status?: string;
  batchReference?: string;
}

export const CLAIM_STATUSES = ['CREATED', 'BATCHED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export function useAutoClaims(fromDate: string, toDate: string, status?: string, page = 0, size = 20) {
  const ready = Boolean(fromDate && toDate);

  const params = new URLSearchParams({
    fromDate,
    toDate,
    page: String(page),
    size: String(size),
  });
  if (status) {
    params.set('status', status);
  }

  const { data, error, isLoading, mutate } = useSWR<{ data: AutoClaimsResponse }>(
    ready ? `${BASE_URL}?${params.toString()}` : null,
    openmrsFetch,
  );

  return {
    claims: data?.data?.results ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export interface PdfExportOptions {
  fromDate: string;
  toDate: string;
  status?: string;
  facilityCode?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  town?: string;
  preparedBy?: string;
  approvedBy?: string;
}

function appendOptional(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    params.set(key, value);
  }
}

export function buildCsvUrl(fromDate: string, toDate: string, status?: string): string {
  const params = new URLSearchParams({ fromDate, toDate });
  appendOptional(params, 'status', status);
  return `${window.location.origin}/openmrs/ws/rest/v1/ethiopia/autoclaim/export/csv?${params}`;
}

export function buildPdfUrl(opts: PdfExportOptions): string {
  const params = new URLSearchParams({ fromDate: opts.fromDate, toDate: opts.toDate });

  (
    [
      ['status', opts.status],
      ['facilityCode', opts.facilityCode],
      ['region', opts.region],
      ['zone', opts.zone],
      ['woreda', opts.woreda],
      ['town', opts.town],
      ['preparedBy', opts.preparedBy],
      ['approvedBy', opts.approvedBy],
    ] as Array<[string, string | undefined]>
  ).forEach(([key, value]) => appendOptional(params, key, value));

  return `${window.location.origin}/openmrs/ws/rest/v1/ethiopia/autoclaim/export/pdf?${params}`;
}

export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function updateClaimStatus(uuid: string, status: string, batchReference?: string): Promise<void> {
  await openmrsFetch(`${BASE_URL}/${uuid}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(batchReference ? { batchReference } : {}) }),
  });
}

export async function updateClaim(uuid: string, payload: ClaimEditPayload): Promise<AutoClaimItem> {
  const response = await openmrsFetch<AutoClaimItem>(`${BASE_URL}/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.data;
}
