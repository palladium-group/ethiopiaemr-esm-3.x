import { showModal } from '@openmrs/esm-framework';

export interface ServerFieldError {
  field: string;
  message: string;
}

export interface ParsedServerError {
  status?: number;
  statusText?: string;
  url?: string;
  message: string;
  globalErrors: Array<string>;
  fieldErrors: Array<ServerFieldError>;
  /** Everything the server sent back (or the client-side error), for the raw JSON view. */
  raw: unknown;
}

type OpenmrsErrorBody = {
  error?: {
    message?: string;
    code?: string;
    detail?: string;
    globalErrors?: Array<{ code?: string; message?: string }>;
    fieldErrors?: Record<string, Array<{ code?: string; message?: string }>>;
  };
};

/**
 * Normalises an error thrown by openmrsFetch (OpenmrsFetchError) or any other error into something that can be
 * rendered: a summary message, OpenMRS global/field validation errors and the raw response body.
 */
export function parseServerError(error: unknown): ParsedServerError {
  const err = error as {
    message?: string;
    responseBody?: OpenmrsErrorBody | string | null;
    response?: Response;
  };
  const body = err?.responseBody;
  const openmrsError = body && typeof body === 'object' ? body.error : undefined;

  const fieldErrors = Object.entries(openmrsError?.fieldErrors ?? {}).flatMap(([field, errors]) =>
    (errors ?? []).map((fieldError) => ({ field, message: fieldError?.message ?? fieldError?.code ?? '' })),
  );
  const globalErrors = (openmrsError?.globalErrors ?? [])
    .map((globalError) => globalError?.message ?? globalError?.code)
    .filter(Boolean);

  const message =
    openmrsError?.message ??
    (typeof body === 'string' && body.trim() ? body : undefined) ??
    err?.message ??
    String(error);

  return {
    status: err?.response?.status,
    statusText: err?.response?.statusText,
    url: err?.response?.url,
    message,
    globalErrors,
    fieldErrors,
    raw: body ?? (error instanceof Error ? { name: error.name, message: error.message } : error),
  };
}

/** Opens a modal with the full server error so it can be read (and copied) instead of vanishing in a toast. */
export function showServerErrorModal(title: string, error: unknown, description?: string) {
  const dispose = showModal('admin-server-error-modal', {
    closeModal: () => dispose(),
    title,
    description,
    error: parseServerError(error),
  });
}
