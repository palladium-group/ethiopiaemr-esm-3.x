import { buildListUrl, extractErrorMessage, isAbortError, isTimeoutError, pendingCount } from './shr.resource';

describe('buildListUrl', () => {
  it('encodes the status filter into the query string', () => {
    expect(buildListUrl('PENDING', 0, 20)).toBe(
      '/ws/rest/v1/ethiopiaemrshr/outbox/list?status=PENDING&offset=0&limit=20',
    );
  });

  it('escapes characters that would break the query string', () => {
    expect(buildListUrl('A&B', 40, 10)).toBe('/ws/rest/v1/ethiopiaemrshr/outbox/list?status=A%26B&offset=40&limit=10');
  });
});

describe('pendingCount', () => {
  it('returns the reported PENDING count, including zero', () => {
    expect(pendingCount({ PENDING: 7 })).toBe(7);
    expect(pendingCount({ PENDING: 0 })).toBe(0);
  });

  it('returns undefined when the server did not report PENDING at all', () => {
    expect(pendingCount({ SENT: 3 })).toBeUndefined();
    expect(pendingCount(undefined)).toBeUndefined();
  });
});

describe('isAbortError / isTimeoutError', () => {
  it('classifies DOMException names', () => {
    const abort = new DOMException('gone', 'AbortError');
    const timeout = new DOMException('slow', 'TimeoutError');
    expect(isAbortError(abort)).toBe(true);
    expect(isTimeoutError(abort)).toBe(false);
    expect(isAbortError(timeout)).toBe(false);
    expect(isTimeoutError(timeout)).toBe(true);
  });

  it('rejects non-error values without throwing', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isTimeoutError({ name: 42 })).toBe(false);
  });
});

describe('extractErrorMessage', () => {
  it('prefers the OpenMRS structured error body', () => {
    const e = { message: 'outer', responseBody: { error: { message: 'privilege required' } } };
    expect(extractErrorMessage(e)).toBe('privilege required');
  });

  it('falls back to a flat message in the response body', () => {
    const e = { message: 'outer', responseBody: { message: 'flat body message' } };
    expect(extractErrorMessage(e)).toBe('flat body message');
  });

  it('falls back to the error message when there is no usable body', () => {
    expect(extractErrorMessage(new Error('network down'))).toBe('network down');
    expect(extractErrorMessage({ message: 'plain', responseBody: { error: {} } })).toBe('plain');
  });

  it('returns null when nothing user-meaningful is available', () => {
    expect(extractErrorMessage(null)).toBeNull();
    expect(extractErrorMessage('boom')).toBeNull();
    expect(extractErrorMessage({})).toBeNull();
  });
});
