export interface AppointmentSaveDetails {
  patientUuid: string;
  startDateTime: string;
}

type AppointmentSaveListener = (details: AppointmentSaveDetails) => void | Promise<void>;

let activeListener: AppointmentSaveListener | null = null;
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

function parseAppointmentSaveRequest(
  url: string,
  method: string,
  body: BodyInit | null | undefined,
): AppointmentSaveDetails | null {
  if (method !== 'POST') {
    return null;
  }

  const pathname = getRequestPathname(url);
  const payload = parseRequestBody(body);
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (pathname.endsWith('/appointment')) {
    const record = payload as { patientUuid?: string; startDateTime?: string };
    if (record.patientUuid && record.startDateTime) {
      return { patientUuid: record.patientUuid, startDateTime: record.startDateTime };
    }
    return null;
  }

  if (pathname.endsWith('/recurring-appointments')) {
    const record = payload as { appointmentRequest?: { patientUuid?: string; startDateTime?: string } };
    const request = record.appointmentRequest;
    if (request?.patientUuid && request?.startDateTime) {
      return { patientUuid: request.patientUuid, startDateTime: request.startDateTime };
    }
  }

  return null;
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

async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await originalFetch!(input, init);

  const listener = activeListener;
  if (listener) {
    try {
      const url = getRequestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      const saveRequest = parseAppointmentSaveRequest(url, method, init?.body ?? null);

      if (saveRequest && response.ok) {
        Promise.resolve(listener(saveRequest)).catch(() => undefined);
      }
    } catch {
      // Never break unrelated fetch calls.
    }
  }

  return response;
}

/**
 * Observes successful appointment create/recurring-create requests while the radiology
 * scheduling workspace is open. This provides push-based sync without modifying
 * esm-appointments-app.
 */
export function installAppointmentSaveInterceptor(listener: AppointmentSaveListener): () => void {
  if (!isPatched) {
    if (typeof window.fetch !== 'function') {
      return () => undefined;
    }
    originalFetch = window.fetch.bind(window);
    window.fetch = patchedFetch;
    isPatched = true;
  }

  activeListener = listener;

  return () => {
    if (activeListener === listener) {
      activeListener = null;
    }
    if (isPatched && activeListener == null) {
      window.fetch = originalFetch!;
      originalFetch = null;
      isPatched = false;
    }
  };
}
