import { installAppointmentSaveInterceptor } from './appointment-save-interceptor';

describe('installAppointmentSaveInterceptor', () => {
  const underlyingFetch = jest.fn(async () => ({ ok: true } as Response));

  beforeEach(() => {
    underlyingFetch.mockClear();
    window.fetch = underlyingFetch as typeof window.fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies listeners when an appointment is created', async () => {
    const listener = jest.fn();
    const remove = installAppointmentSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/appointment', {
      method: 'POST',
      body: JSON.stringify({
        patientUuid: 'patient-1',
        startDateTime: '2026-07-21T10:00:00.000Z',
      }),
    });

    expect(listener).toHaveBeenCalledWith({
      patientUuid: 'patient-1',
      startDateTime: '2026-07-21T10:00:00.000Z',
    });

    remove();
  });

  it('ignores appointment search requests', async () => {
    const listener = jest.fn();
    const remove = installAppointmentSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/appointments/search', {
      method: 'POST',
      body: JSON.stringify({ patientUuid: 'patient-1' }),
    });

    expect(listener).not.toHaveBeenCalled();
    remove();
  });

  it('notifies listeners for recurring appointment saves', async () => {
    const listener = jest.fn();
    const remove = installAppointmentSaveInterceptor(listener);

    await window.fetch('/ws/rest/v1/recurring-appointments', {
      method: 'POST',
      body: JSON.stringify({
        appointmentRequest: {
          patientUuid: 'patient-1',
          startDateTime: '2026-07-21T10:00:00.000Z',
        },
      }),
    });

    expect(listener).toHaveBeenCalledWith({
      patientUuid: 'patient-1',
      startDateTime: '2026-07-21T10:00:00.000Z',
    });

    remove();
  });
});
