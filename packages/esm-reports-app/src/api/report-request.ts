import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface ReportDataSet {
  name: string;
  rows: Array<Record<string, unknown>>;
}

/**
 * Runs a report synchronously and returns its datasets. Mirrors the legacy GSP's
 * GET reportingrest/reportdata/{uuid}?<params> call.
 */
export async function runReport(reportUuid: string, params: Record<string, string>): Promise<Array<ReportDataSet>> {
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${restBaseUrl}/reportingrest/reportdata/${reportUuid}${query ? `?${query}` : ''}`;

  const response = await openmrsFetch<{ dataSets?: Array<any> }>(url);
  const dataSets = response.data?.dataSets ?? [];
  return dataSets.map((ds) => ({
    name: ds?.definition?.name ?? 'Dataset',
    rows: ds?.rows ?? [],
  }));
}

const REQUEST_URL = `${restBaseUrl}/reportingrest/reportRequest`;
const DOWNLOAD_URL = `${restBaseUrl}/reportingrest/downloadReport`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Downloads a report rendered through a ReportDesign (e.g. the Excel template).
 * reportingrest exposes this as a 3-step flow: queue a reportRequest with the
 * design as the rendering mode, poll until COMPLETED, then fetch the rendered
 * output (base64 JSON) and trigger a browser download.
 */
export async function downloadReportDesign(
  reportUuid: string,
  designUuid: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<void> {
  const body = {
    status: 'REQUESTED',
    reportDefinition: {
      parameterizable: { uuid: reportUuid },
      parameterMappings: params,
    },
    renderingMode: { argument: designUuid },
  };

  const queued = await openmrsFetch<{ uuid: string }>(REQUEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal,
  });
  const requestUuid = queued.data?.uuid;
  if (!requestUuid) {
    throw new Error('Report request was not accepted by the server.');
  }

  await pollUntilComplete(requestUuid, signal);

  const downloaded = await openmrsFetch<{ fileContent: string; contentType?: string; filename?: string }>(
    `${DOWNLOAD_URL}?reportRequestUuid=${encodeURIComponent(requestUuid)}`,
    { signal },
  );
  const { fileContent, contentType, filename } = downloaded.data;
  saveBlob(base64ToBytes(fileContent), contentType || 'application/octet-stream', filename || 'report.xls');
}

async function pollUntilComplete(requestUuid: string, signal?: AbortSignal): Promise<void> {
  for (let attempt = 0; attempt <= 60; attempt++) {
    signal?.throwIfAborted();
    const response = await openmrsFetch<{ status: string }>(`${REQUEST_URL}/${requestUuid}?v=default`, { signal });
    const status = response.data?.status;
    if (status === 'COMPLETED') {
      return;
    }
    if (status === 'FAILED') {
      throw new Error('Report evaluation failed on the server.');
    }
    await delay(1000);
  }
  throw new Error('Report timed out.');
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function saveBlob(bytes: Uint8Array, type: string, filename: string): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type });
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
