export interface VisitSaveDetails {
  patientUuid: string;
  visitUuid?: string;
}

export type VisitSaveListener = (details: VisitSaveDetails) => void | Promise<void>;

export interface AppointmentCheckInDetails {
  patientUuid: string;
  appointmentUuid?: string;
}

export type AppointmentCheckInListener = (details: AppointmentCheckInDetails) => void | Promise<void>;

export interface VisitStopDetails {
  patientUuid: string;
  visitUuid: string;
}

export type VisitStopListener = (details: VisitStopDetails) => void | Promise<void>;

const visitSaveListeners = new Set<VisitSaveListener>();
const appointmentCheckInListeners = new Set<AppointmentCheckInListener>();
const visitStopListeners = new Set<VisitStopListener>();
let originalFetch: typeof window.fetch | null = null;
let isPatched = false;

function parseRequestBody(body: BodyInit | null | undefined): unknown {
  if (body == null) {
    return null;
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return null;
}

function getRequestPathname(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

export function isVisitCreateEndpoint(pathname: string): boolean {
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return normalized.endsWith('/ws/rest/v1/visit') || normalized.endsWith('/visit');
}

export function extractVisitUuidFromPathname(pathname: string): string | undefined {
  return pathname.replace(/\/$/, '').match(/\/visit\/([a-zA-Z0-9-]+)$/)?.[1];
}

export const isVisitStopEndpoint = (pathname: string): boolean => Boolean(extractVisitUuidFromPathname(pathname));

export function isVisitStopPayload(payload: unknown): boolean {
  return Boolean(payload && typeof payload === 'object' && ('stopDatetime' in payload || 'stopDate' in payload));
}

export function isAppointmentEndpoint(pathname: string): boolean {
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return normalized.includes('/ws/rest/v1/appointment') || normalized.includes('/appointment');
}

export function isCheckedInPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return record.status === 'CheckedIn';
}

export function extractAppointmentUuidFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/\/appointment\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : undefined;
}

export function extractPatientUuidFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.patient === 'string' && record.patient.trim()) {
    return record.patient.trim();
  }
  if (record.patient && typeof record.patient === 'object') {
    const nested = record.patient as Record<string, unknown>;
    if (typeof nested.uuid === 'string' && nested.uuid.trim()) {
      return nested.uuid.trim();
    }
  }
  if (typeof record.patientUuid === 'string' && record.patientUuid.trim()) {
    return record.patientUuid.trim();
  }
  if (record.appointment && typeof record.appointment === 'object') {
    const nestedAppt = record.appointment as Record<string, unknown>;
    const fromNested = extractPatientUuidFromPayload(nestedAppt);
    if (fromNested) {
      return fromNested;
    }
  }
  return null;
}

function notify<T>(listeners: Set<(details: T) => void | Promise<void>>, details: T) {
  listeners.forEach((listener) => {
    try {
      Promise.resolve(listener(details)).catch(() => undefined);
    } catch {
      // Never break unrelated fetch calls.
    }
  });
}

async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await originalFetch!.call(window, input, init);

  if (visitSaveListeners.size > 0 || appointmentCheckInListeners.size > 0 || visitStopListeners.size > 0) {
    try {
      const url = getRequestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      const pathname = getRequestPathname(url);
      const reqBody = parseRequestBody(init?.body);

      // Handle Visit Creation
      if (visitSaveListeners.size > 0 && method === 'POST' && isVisitCreateEndpoint(pathname) && response.ok) {
        let patientUuid = extractPatientUuidFromPayload(reqBody);
        let visitUuid: string | undefined;

        if (!patientUuid) {
          try {
            const data = await response.clone().json();
            patientUuid = extractPatientUuidFromPayload(data);
            if (typeof data?.uuid === 'string') {
              visitUuid = data.uuid;
            }
          } catch {
            // response clone / json failed
          }
        }

        if (patientUuid) {
          notify(visitSaveListeners, { patientUuid, visitUuid });
        }
      }

      // Handle Visit Stop / Checkout (POST, PATCH, PUT to /visit/:uuid with stopDatetime)
      const visitUuid =
        visitStopListeners.size > 0 && (method === 'POST' || method === 'PATCH' || method === 'PUT')
          ? extractVisitUuidFromPathname(pathname)
          : undefined;

      if (visitUuid && isVisitStopPayload(reqBody) && response.ok) {
        const patientUuid =
          extractPatientUuidFromPayload(reqBody) ||
          (await response
            .clone()
            .json()
            .then(extractPatientUuidFromPayload)
            .catch(() => null)) ||
          (typeof window !== 'undefined' ? window.location.pathname.match(/\/patient\/([a-zA-Z0-9-]+)/)?.[1] : null);

        if (patientUuid) {
          notify(visitStopListeners, { patientUuid, visitUuid });
        }
      }

      // Handle Appointment Check-In (POST, PATCH, PUT)
      if (
        appointmentCheckInListeners.size > 0 &&
        (method === 'POST' || method === 'PATCH' || method === 'PUT') &&
        isAppointmentEndpoint(pathname) &&
        response.ok
      ) {
        let isCheckIn = isCheckedInPayload(reqBody);
        let patientUuid = extractPatientUuidFromPayload(reqBody);
        let appointmentUuid = extractAppointmentUuidFromPathname(pathname);

        if (!isCheckIn || !patientUuid) {
          try {
            const data = await response.clone().json();
            if (!isCheckIn) {
              isCheckIn = isCheckedInPayload(data);
            }
            if (!patientUuid) {
              patientUuid = extractPatientUuidFromPayload(data);
            }
            if (!appointmentUuid && typeof data?.uuid === 'string') {
              appointmentUuid = data.uuid;
            }
          } catch {
            // response clone / json failed
          }
        }

        if (isCheckIn && patientUuid) {
          notify(appointmentCheckInListeners, { patientUuid, appointmentUuid });
        }
      }
    } catch {
      // Never break unrelated fetch calls.
    }
  }

  return response;
}

function ensureFetchPatched(): boolean {
  if (!isPatched) {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      return false;
    }
    originalFetch = window.fetch;
    window.fetch = patchedFetch;
    isPatched = true;
  }
  return true;
}

function checkAndRestoreFetch() {
  if (
    isPatched &&
    visitSaveListeners.size === 0 &&
    appointmentCheckInListeners.size === 0 &&
    visitStopListeners.size === 0
  ) {
    if (originalFetch) {
      window.fetch = originalFetch;
      originalFetch = null;
    }
    isPatched = false;
  }
}

/**
 * Observes successful visit creation requests.
 * Supports multiple subscribers.
 */
export function installVisitSaveInterceptor(listener: VisitSaveListener): () => void {
  if (!ensureFetchPatched()) {
    return () => undefined;
  }

  visitSaveListeners.add(listener);

  return () => {
    visitSaveListeners.delete(listener);
    checkAndRestoreFetch();
  };
}

/**
 * Observes successful visit stop / checkout requests (e.g. POST /visit/:uuid with stopDatetime).
 * Supports multiple subscribers.
 */
export function installVisitStopInterceptor(listener: VisitStopListener): () => void {
  if (!ensureFetchPatched()) {
    return () => undefined;
  }

  visitStopListeners.add(listener);

  return () => {
    visitStopListeners.delete(listener);
    checkAndRestoreFetch();
  };
}

/**
 * Observes successful appointment check-in requests (e.g. PATCH /appointment/:uuid with status: CheckedIn).
 * Supports multiple subscribers.
 */
export function installAppointmentCheckInInterceptor(listener: AppointmentCheckInListener): () => void {
  if (!ensureFetchPatched()) {
    return () => undefined;
  }

  appointmentCheckInListeners.add(listener);

  return () => {
    appointmentCheckInListeners.delete(listener);
    checkAndRestoreFetch();
  };
}
