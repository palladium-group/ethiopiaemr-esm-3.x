import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import {
  completePatientCheckedInAppointments,
  subscribeVisitCheckoutAppointmentSync,
} from './appointment-checkout-sync';
import { installVisitStopInterceptor } from '../queue-room/visit-save-interceptor';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

jest.mock('swr', () => ({
  mutate: jest.fn(),
}));

jest.mock('../queue-room/visit-save-interceptor', () => ({
  installVisitStopInterceptor: jest.fn(),
}));

const mockOpenmrsFetch = openmrsFetch as jest.Mock;
const mockMutate = mutate as jest.Mock;
const mockInstallVisitStopInterceptor = installVisitStopInterceptor as jest.Mock;

describe('appointment-checkout-sync', () => {
  const patientUuid = '4b39d747-5a14-4ade-bbda-8f71caaa5f10';
  const appointmentUuid = '218ccad9-a337-4376-bf28-a9397cb62d63';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('completePatientCheckedInAppointments', () => {
    it('searches appointments and terminates CheckedIn appointment with Completed status', async () => {
      mockOpenmrsFetch.mockImplementation(async (url: string, init: any) => {
        if (url.includes('/appointments/search')) {
          return {
            data: [
              {
                uuid: appointmentUuid,
                appointmentNumber: '261026154322264',
                status: 'CheckedIn',
                startDateTime: 1793029380000,
              },
              {
                uuid: 'other-appt',
                status: 'Completed',
                startDateTime: 1793025000000,
              },
            ],
          };
        }
        if (url.includes(`/appointments/${appointmentUuid}/status-change`)) {
          return {
            data: {
              uuid: appointmentUuid,
              status: 'Completed',
            },
          };
        }
        return { data: {} };
      });

      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      await completePatientCheckedInAppointments(patientUuid);

      // Verify search call
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(
        '/ws/rest/v1/appointments/search',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.objectContaining({
            patientUuid,
            startDate: expect.any(String),
          }),
        }),
      );

      // Verify status-change call
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(
        `/ws/rest/v1/appointments/${appointmentUuid}/status-change`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.objectContaining({
            toStatus: 'Completed',
            onDate: expect.any(String),
            timeZone: expect.any(String),
          }),
        }),
      );

      // Verify cache invalidation and custom event
      expect(mockMutate).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'appointment-updated' }));

      dispatchSpy.mockRestore();
    });

    it('falls back to 6-month search if no CheckedIn appointments found for today', async () => {
      let callCount = 0;
      mockOpenmrsFetch.mockImplementation(async (url: string) => {
        if (url.includes('/appointments/search')) {
          callCount++;
          if (callCount === 1) {
            // First search (today) returns no CheckedIn appointments
            return {
              data: [
                {
                  uuid: 'scheduled-appt',
                  status: 'Scheduled',
                },
              ],
            };
          }
          // Fallback search returns the CheckedIn appointment
          return {
            data: [
              {
                uuid: appointmentUuid,
                status: 'CheckedIn',
              },
            ],
          };
        }
        if (url.includes('/status-change')) {
          return { data: { uuid: appointmentUuid, status: 'Completed' } };
        }
        return { data: {} };
      });

      await completePatientCheckedInAppointments(patientUuid);

      expect(callCount).toBe(2);
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(
        `/ws/rest/v1/appointments/${appointmentUuid}/status-change`,
        expect.objectContaining({
          body: expect.objectContaining({
            toStatus: 'Completed',
          }),
        }),
      );
    });

    it('does nothing when no CheckedIn appointments are found', async () => {
      mockOpenmrsFetch.mockResolvedValue({
        data: [{ uuid: 'other-appt', status: 'Completed' }],
      });

      await completePatientCheckedInAppointments(patientUuid);

      expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/appointments/search', expect.anything());
      expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(expect.stringContaining('/status-change'), expect.anything());
    });

    it('handles empty patientUuid gracefully', async () => {
      await completePatientCheckedInAppointments('');
      expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    });

    it('catches and logs errors without throwing', async () => {
      mockOpenmrsFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(completePatientCheckedInAppointments(patientUuid)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('subscribeVisitCheckoutAppointmentSync', () => {
    it('installs interceptor and triggers completion on visit stop', async () => {
      let registeredListener: (details: { patientUuid: string; visitUuid: string }) => Promise<void>;
      const uninstallMock = jest.fn();

      mockInstallVisitStopInterceptor.mockImplementation((listener) => {
        registeredListener = listener;
        return uninstallMock;
      });

      mockOpenmrsFetch.mockResolvedValue({
        data: [{ uuid: appointmentUuid, status: 'CheckedIn' }],
      });

      const unsubscribe = subscribeVisitCheckoutAppointmentSync();

      expect(mockInstallVisitStopInterceptor).toHaveBeenCalled();

      // Simulate a visit stop event
      await registeredListener({ patientUuid, visitUuid: 'visit-1' });

      expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/appointments/search', expect.anything());

      unsubscribe();
      expect(uninstallMock).toHaveBeenCalled();
    });
  });
});
