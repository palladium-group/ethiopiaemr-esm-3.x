import { getGlobalStore, launchWorkspace2 } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import {
  CREATE_QUEUE_ENTRY_WORKSPACE,
  APPOINTMENTS_WINDOW,
  APPOINTMENTS_START_VISIT_WORKSPACE,
  isAppointmentsContext,
  isStartVisitWorkspaceOpen,
  handleVisitSaved,
  handleAppointmentCheckedIn,
  subscribeAppointmentCheckInQueueSync,
} from './appointment-checkin-queue-sync';

jest.mock('@openmrs/esm-framework', () => ({
  getGlobalStore: jest.fn(),
  launchWorkspace2: jest.fn().mockResolvedValue(true),
}));

jest.mock('swr', () => ({
  mutate: jest.fn(),
}));

describe('appointment-checkin-queue-sync', () => {
  let mockWorkspaceStore: {
    getState: jest.Mock;
    subscribe: jest.Mock;
  };
  let subscribers: Array<(state: any) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    subscribers = [];
    mockWorkspaceStore = {
      getState: jest.fn().mockReturnValue({
        openedWindows: [],
      }),
      subscribe: jest.fn().mockImplementation((fn) => {
        subscribers.push(fn);
        return () => {
          const index = subscribers.indexOf(fn);
          if (index >= 0) {
            subscribers.splice(index, 1);
          }
        };
      }),
    };

    (getGlobalStore as jest.Mock).mockReturnValue(mockWorkspaceStore);

    // Default window location
    delete (window as any).location;
    window.location = new URL('http://localhost/openmrs/spa/home/appointments') as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isAppointmentsContext', () => {
    it('returns true when window.location includes /appointments', () => {
      window.location = new URL('http://localhost/openmrs/spa/home/appointments') as any;
      expect(isAppointmentsContext()).toBe(true);
    });

    it('returns true when appointments-window is open in workspaceStore', () => {
      window.location = new URL('http://localhost/openmrs/spa/home/service-queues') as any;
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [{ windowName: APPOINTMENTS_WINDOW }],
      });
      expect(isAppointmentsContext()).toBe(true);
    });

    it('returns true when appointments-start-visit-workspace is open in any window', () => {
      window.location = new URL('http://localhost/openmrs/spa/home/service-queues') as any;
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [
          {
            windowName: 'some-window',
            openedWorkspaces: [{ workspaceName: APPOINTMENTS_START_VISIT_WORKSPACE }],
          },
        ],
      });
      expect(isAppointmentsContext()).toBe(true);
    });

    it('returns false when outside appointments and no appointments window is open', () => {
      window.location = new URL('http://localhost/openmrs/spa/home/service-queues') as any;
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [{ windowName: 'add-queue-entry' }],
      });
      expect(isAppointmentsContext()).toBe(false);
    });
  });

  describe('isStartVisitWorkspaceOpen', () => {
    it('returns true when appointments-start-visit-workspace is open in appointments-window', () => {
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [
          {
            windowName: APPOINTMENTS_WINDOW,
            openedWorkspaces: [{ workspaceName: APPOINTMENTS_START_VISIT_WORKSPACE }],
          },
        ],
      });
      expect(isStartVisitWorkspaceOpen()).toBe(true);
    });

    it('returns false when start-visit workspace is not open', () => {
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [
          {
            windowName: APPOINTMENTS_WINDOW,
            openedWorkspaces: [{ workspaceName: 'appointments-form-workspace' }],
          },
        ],
      });
      expect(isStartVisitWorkspaceOpen()).toBe(false);
    });
  });

  describe('handleVisitSaved', () => {
    it('launches create-queue-entry-workspace when visit workspace closes', async () => {
      // Initially start visit workspace is open
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [
          {
            windowName: APPOINTMENTS_WINDOW,
            openedWorkspaces: [{ workspaceName: APPOINTMENTS_START_VISIT_WORKSPACE }],
          },
        ],
      });

      handleVisitSaved('patient-test-1');

      expect(launchWorkspace2).not.toHaveBeenCalled();

      // Simulate visit workspace closing
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [
          {
            windowName: APPOINTMENTS_WINDOW,
            openedWorkspaces: [],
          },
        ],
      });

      // Trigger workspace store subscriptions
      subscribers.forEach((fn) => fn(mockWorkspaceStore.getState()));

      // Fast forward past the 50ms close timeout
      jest.advanceTimersByTime(60);

      expect(mutate).toHaveBeenCalled();
      expect(launchWorkspace2).toHaveBeenCalledWith(
        CREATE_QUEUE_ENTRY_WORKSPACE,
        {
          selectedPatientUuid: 'patient-test-1',
        },
        {
          startVisitWorkspaceName: 'queue-patient-search-start-visit-workspace',
        },
      );
    });

    it('falls back to launching after 450ms if workspace subscription does not fire', () => {
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [],
      });

      handleVisitSaved('patient-fallback');

      expect(launchWorkspace2).not.toHaveBeenCalled();

      jest.advanceTimersByTime(460);

      expect(launchWorkspace2).toHaveBeenCalledWith(
        CREATE_QUEUE_ENTRY_WORKSPACE,
        {
          selectedPatientUuid: 'patient-fallback',
        },
        {
          startVisitWorkspaceName: 'queue-patient-search-start-visit-workspace',
        },
      );
    });

    it('does nothing when outside appointments context', () => {
      window.location = new URL('http://localhost/openmrs/spa/home/service-queues') as any;
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [],
      });

      handleVisitSaved('patient-unrelated');

      jest.advanceTimersByTime(500);

      expect(launchWorkspace2).not.toHaveBeenCalled();
    });
  });

  describe('handleAppointmentCheckedIn', () => {
    it('launches queue entry workspace when patient already had an active visit (no start-visit form opened)', () => {
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [],
      });

      handleAppointmentCheckedIn('patient-active-visit');

      expect(launchWorkspace2).not.toHaveBeenCalled();

      // Advance past the 400ms check
      jest.advanceTimersByTime(410);

      expect(launchWorkspace2).toHaveBeenCalledWith(
        CREATE_QUEUE_ENTRY_WORKSPACE,
        {
          selectedPatientUuid: 'patient-active-visit',
        },
        {
          startVisitWorkspaceName: 'queue-patient-search-start-visit-workspace',
        },
      );
    });

    it('does not launch immediately if start-visit workspace opened for visit creation', () => {
      // Start visit workspace opened immediately on checkin click
      mockWorkspaceStore.getState.mockReturnValue({
        openedWindows: [
          {
            windowName: APPOINTMENTS_WINDOW,
            openedWorkspaces: [{ workspaceName: APPOINTMENTS_START_VISIT_WORKSPACE }],
          },
        ],
      });

      handleAppointmentCheckedIn('patient-needs-visit');

      jest.advanceTimersByTime(410);

      // Should not launch because start visit form is open
      expect(launchWorkspace2).not.toHaveBeenCalled();
    });
  });

  describe('subscribeAppointmentCheckInQueueSync', () => {
    it('subscribes and cleans up cleanly', () => {
      const unsubscribe = subscribeAppointmentCheckInQueueSync();
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});
