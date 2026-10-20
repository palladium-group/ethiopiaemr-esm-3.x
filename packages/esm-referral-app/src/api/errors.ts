export function extractErrorMessage(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) {
    return null;
  }
  const obj = e as Record<string, unknown>;
  const body = obj['responseBody'];
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b['message'] === 'string') {
      return b['message'];
    }
    const errMsg = (b['error'] as Record<string, unknown> | undefined)?.['message'];
    if (typeof errMsg === 'string') {
      return errMsg;
    }
  }
  if (typeof obj['message'] === 'string') {
    return obj['message'];
  }
  return null;
}
