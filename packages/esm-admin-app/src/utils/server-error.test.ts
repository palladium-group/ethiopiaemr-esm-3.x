import { parseServerError } from './server-error';

describe('parseServerError', () => {
  it('extracts the OpenMRS message, global and field errors from a fetch error', () => {
    const responseBody = {
      error: {
        message: '[Invalid Submission : user]',
        globalErrors: [{ code: 'error.global', message: 'Something is wrong' }],
        fieldErrors: { username: [{ code: 'username.taken', message: 'Username already in use' }] },
      },
    };
    const error = Object.assign(new Error('Server responded with 400'), {
      responseBody,
      response: { status: 400, statusText: 'Bad Request', url: '/ws/rest/v1/user' },
    });

    expect(parseServerError(error)).toEqual({
      status: 400,
      statusText: 'Bad Request',
      url: '/ws/rest/v1/user',
      message: '[Invalid Submission : user]',
      globalErrors: ['Something is wrong'],
      fieldErrors: [{ field: 'username', message: 'Username already in use' }],
      raw: responseBody,
    });
  });

  it('falls back to a plain-text body and then to the error message', () => {
    expect(parseServerError({ responseBody: 'Gateway timeout' }).message).toBe('Gateway timeout');

    const parsed = parseServerError(new Error('Network down'));
    expect(parsed.message).toBe('Network down');
    expect(parsed.raw).toEqual({ name: 'Error', message: 'Network down' });
    expect(parsed.fieldErrors).toEqual([]);
  });
});
