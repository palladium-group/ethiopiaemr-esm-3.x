import {
  installVisitSaveInterceptor,
  installAppointmentCheckInInterceptor,
  isVisitCreateEndpoint,
  isAppointmentEndpoint,
  isCheckedInPayload,
  extractPatientUuidFromPayload,
} from './visit-save-interceptor';

describe('visit-save-interceptor helpers', () => {
  it('identifies visit create endpoints accurately', () => {
    expect(isVisitCreateEndpoint('/ws/rest/v1/visit')).toBe(true);
    expect(isVisitCreateEndpoint('/ws/rest/v1/visit/')).toBe(true);
    expect(isVisitCreateEndpoint('/openmrs/ws/rest/v1/visit')).toBe(true);
    expect(isVisitCreateEndpoint('/visit')).toBe(true);

    // Updates or nested endpoints should NOT be identified as create
    expect(isVisitCreateEndpoint('/ws/rest/v1/visit/123-uuid')).toBe(false);
    expect(isVisitCreateEndpoint('/ws/rest/v1/visit/123-uuid/')).toBe(false);
    expect(isVisitCreateEndpoint('/ws/rest/v1/visittype')).toBe(false);
  });

  it('identifies appointment endpoints accurately', () => {
    expect(isAppointmentEndpoint('/ws/rest/v1/appointment')).toBe(true);
    expect(isAppointmentEndpoint('/ws/rest/v1/appointment/123-uuid')).toBe(true);
    expect(isAppointmentEndpoint('/openmrs/ws/rest/v1/appointment/123-uuid/')).toBe(true);
    expect(isAppointmentEndpoint('/openmrs/ws/rest/v1/patient')).toBe(false);
  });

  it('identifies CheckedIn payload accurately', () => {
    expect(isCheckedInPayload({ status: 'CheckedIn' })).toBe(true);
    expect(isCheckedInPayload({ status: 'Scheduled' })).toBe(false);
    expect(isCheckedInPayload(null)).toBe(false);
  });

  it('extracts patientUuid from various payload shapes', () => {
    expect(extractPatientUuidFromPayload({ patient: 'patient-1' })).toBe('patient-1');
    expect(extractPatientUuidFromPayload({ patient: { uuid: 'patient-2' } })).toBe('patient-2');
    expect(extractPatientUuidFromPayload({ patientUuid: 'patient-3' })).toBe('patient-3');
    expect(extractPatientUuidFromPayload({ appointment: { patient: { uuid: 'patient-4' } } })).toBe('patient-4');
    expect(extractPatientUuidFromPayload(null)).toBeNull();
    expect(extractPatientUuidFromPayload({})).toBeNull();
  });
});

describe('installVisitSaveInterceptor', () => {
  const underlyingFetch = jest.fn(
    async () =>
      ({
        ok: true,
        clone: () => ({
          json: async () => ({ uuid: 'visit-1', patient: { uuid: 'patient-from-res' } }),
        }),
      } as unknown as Response),
  );

  beforeEach(() => {
    underlyingFetch.mockClear();
    window.fetch = underlyingFetch as typeof window.fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies listeners when a visit is created with patient string UUID', async () => {
    const listener = jest.fn();
    const uninstall = installVisitSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/visit', {
      method: 'POST',
      body: JSON.stringify({
        patient: 'patient-123',
        visitType: 'type-uuid',
      }),
    });

    expect(listener).toHaveBeenCalledWith({
      patientUuid: 'patient-123',
      visitUuid: undefined,
    });

    uninstall();
  });

  it('notifies listeners when a visit is created with nested patient object', async () => {
    const listener = jest.fn();
    const uninstall = installVisitSaveInterceptor(listener);

    await window.fetch('/openmrs/ws/rest/v1/visit', {
      method: 'POST',
      body: JSON.stringify({
        patient: { uuid: 'patient-nested' },
        visitType: 'type-uuid',
      }),
    });

    expect(listener).toHaveBeenCalledWith({
      patientUuid: 'patient-nested',
      visitUuid: undefined,
    });

    uninstall();
  });

  it('extracts patient from response if not in request body', async () => {
    const listener = jest.fn();
    const uninstall = installVisitSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/visit', {
      method: 'POST',
      body: JSON.stringify({
        visitType: 'type-uuid',
      }),
    });

    expect(listener).toHaveBeenCalledWith({
      patientUuid: 'patient-from-res',
      visitUuid: 'visit-1',
    });

    uninstall();
  });

  it('ignores GET requests to /visit', async () => {
    const listener = jest.fn();
    const uninstall = installVisitSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/visit?patient=123', {
      method: 'GET',
    });

    expect(listener).not.toHaveBeenCalled();
    uninstall();
  });

  it('ignores visit update requests (e.g. /visit/uuid)', async () => {
    const listener = jest.fn();
    const uninstall = installVisitSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/visit/existing-visit-uuid', {
      method: 'POST',
      body: JSON.stringify({ stopDatetime: new Date().toISOString() }),
    });

    expect(listener).not.toHaveBeenCalled();
    uninstall();
  });

  it('ignores failed requests', async () => {
    underlyingFetch.mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    const listener = jest.fn();
    const uninstall = installVisitSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/visit', {
      method: 'POST',
      body: JSON.stringify({ patient: 'patient-fail' }),
    });

    expect(listener).not.toHaveBeenCalled();
    uninstall();
  });

  it('restores window.fetch upon uninstallation', () => {
    const initialFetch = window.fetch;
    const uninstall = installVisitSaveInterceptor(jest.fn());
    expect(window.fetch).not.toBe(initialFetch);

    uninstall();
    expect(window.fetch).toBe(initialFetch);
  });

  it('notifies multiple visit save listeners without overwriting', async () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    const uninstallA = installVisitSaveInterceptor(listenerA);
    const uninstallB = installVisitSaveInterceptor(listenerB);

    await window.fetch('/ws/rest/v1/visit', {
      method: 'POST',
      body: JSON.stringify({ patient: 'patient-multi' }),
    });

    expect(listenerA).toHaveBeenCalledWith({ patientUuid: 'patient-multi', visitUuid: undefined });
    expect(listenerB).toHaveBeenCalledWith({ patientUuid: 'patient-multi', visitUuid: undefined });

    uninstallA();
    expect(window.fetch).not.toBe(underlyingFetch); // listenerB is still active

    uninstallB();
  });
});

describe('installAppointmentCheckInInterceptor', () => {
  const underlyingFetch = jest.fn(
    async () =>
      ({
        ok: true,
        clone: () => ({
          json: async () => ({
            uuid: 'appt-1',
            status: 'CheckedIn',
            patient: { uuid: 'patient-appt' },
          }),
        }),
      } as unknown as Response),
  );

  beforeEach(() => {
    underlyingFetch.mockClear();
    window.fetch = underlyingFetch as typeof window.fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies listeners when an appointment status is updated to CheckedIn via PATCH', async () => {
    const listener = jest.fn();
    const uninstall = installAppointmentCheckInInterceptor(listener);

    await window.fetch('/ws/rest/v1/appointment/appt-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CheckedIn' }),
    });

    expect(listener).toHaveBeenCalledWith({
      patientUuid: 'patient-appt',
      appointmentUuid: 'appt-1',
    });

    uninstall();
  });

  it('ignores appointment updates with status other than CheckedIn', async () => {
    underlyingFetch.mockResolvedValueOnce({
      ok: true,
      clone: () => ({
        json: async () => ({ uuid: 'appt-2', status: 'Cancelled', patient: { uuid: 'p2' } }),
      }),
    } as unknown as Response);

    const listener = jest.fn();
    const uninstall = installAppointmentCheckInInterceptor(listener);

    await window.fetch('/ws/rest/v1/appointment/appt-2', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Cancelled' }),
    });

    expect(listener).not.toHaveBeenCalled();
    uninstall();
  });
});
