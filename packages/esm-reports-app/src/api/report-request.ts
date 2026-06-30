import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface ReportDataSet {
  name: string;
  /**
   * Column names in their original SQL SELECT order, taken from the dataset's
   * `metadata.columns`. The server preserves declared order here, whereas the
   * per-row JSON objects in `rows` are serialised in hash order — so render
   * against `columns`. This is empty only when the server omits metadata, in
   * which case the renderer falls back to the row keys.
   */
  columns: Array<string>;
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

  const response = await openmrsFetch<{
    dataSets?: Array<{
      definition?: { name?: string };
      metadata?: { columns?: Array<{ name?: string }> };
      rows?: Array<Record<string, unknown>>;
    }>;
  }>(url);
  const dataSets = response.data?.dataSets ?? [];
  return dataSets.map((ds) => ({
    name: ds?.definition?.name ?? 'Dataset',
    // Server-declared SELECT order. May be empty if the server omits metadata,
    // in which case ReportResults falls back to the row keys.
    columns: ds?.metadata?.columns?.map((c) => c?.name).filter((n): n is string => typeof n === 'string') ?? [],
    rows: ds?.rows ?? [],
  }));
}

/**
 * Returns the names of datasets that exist only to feed an Excel (or other)
 * ReportDesign template, so the caller can hide them from the on-screen tables.
 *
 * A ReportDesign's `repeatingSections` property declares which dataset it consumes, in the form
 * `sheet:<n>,row:<a>-<b>,dataset:<name>` (one section per repeating block). Any
 * dataset named there is, by definition, a template feeder. A report with no
 * designs returns an empty set, so a web-only report hides nothing.
 *
 * The captured `<name>` is matched against each dataset's `definition.name` (see
 * ReportResults) to decide what to hide, so a report's dataset key and its
 * `DataSetDefinition` name must agree.
 *
 * `properties` is only serialised by the custom representation, not by the
 * default/full ones, so the explicit `v=custom:(...)` is required.
 */
export async function fetchFeederDatasetNames(reportUuid: string): Promise<Set<string>> {
  const url = `${restBaseUrl}/reportingrest/reportDesign?reportDefinitionUuid=${encodeURIComponent(
    reportUuid,
  )}&v=custom:(uuid,name,properties)`;
  const feeders = new Set<string>();
  try {
    const response = await openmrsFetch<{
      results?: Array<{ properties?: { repeatingSections?: string } }>;
    }>(url);
    for (const design of response.data?.results ?? []) {
      const repeatingSections = design?.properties?.repeatingSections;
      if (!repeatingSections) {
        continue;
      }
      // Each section is comma-delimited; capture every `dataset:<name>` token.
      for (const match of repeatingSections.matchAll(/dataset:([^,\s]+)/g)) {
        feeders.add(match[1]);
      }
    }
  } catch {
    // If designs can't be read, fall back to hiding nothing rather than failing
    // the whole report view — a feeder shown is recoverable; a broken page isn't.
    return new Set<string>();
  }
  return feeders;
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

  // openmrsFetch serialises plain objects to JSON when Content-Type is application/json.
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

const POLL_MAX_ATTEMPTS = 30;
const POLL_BASE_DELAY_MS = 2000;
const POLL_MAX_DELAY_MS = 30000;

async function pollUntilComplete(requestUuid: string, signal?: AbortSignal): Promise<void> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    signal?.throwIfAborted();
    const response = await openmrsFetch<{ status: string }>(`${REQUEST_URL}/${requestUuid}?v=default`, { signal });
    const status = response.data?.status;
    if (status === 'COMPLETED') {
      return;
    }
    if (status === 'FAILED') {
      throw new Error('Report evaluation failed on the server.');
    }
    const backoff = Math.min(POLL_BASE_DELAY_MS * 2 ** attempt, POLL_MAX_DELAY_MS);
    await delay(backoff);
  }
  throw new Error('Report timed out after waiting too long for the server.');
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
