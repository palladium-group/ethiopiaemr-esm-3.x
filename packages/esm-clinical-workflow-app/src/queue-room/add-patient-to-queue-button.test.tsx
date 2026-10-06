import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { getGlobalStore, launchWorkspace2 } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import AddPatientToQueueButton from './add-patient-to-queue-button.component';
import { installVisitSaveInterceptor } from './visit-save-interceptor';
import { useServiceQueuesFilterState } from './service-queues-store.util';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  launchWorkspace2: jest.fn().mockResolvedValue(true),
  getGlobalStore: jest.fn(),
}));

jest.mock('swr', () => ({
  mutate: jest.fn(),
}));

jest.mock('./service-queues-store.util', () => ({
  useServiceQueuesFilterState: jest.fn(),
}));

jest.mock('./visit-save-interceptor', () => ({
  installVisitSaveInterceptor: jest.fn(),
}));

describe('AddPatientToQueueButton', () => {
  let mockStoreSubscribe: jest.Mock;
  let mockStoreGetState: jest.Mock;
  let mockStoreState: any;
  let storeListeners: Array<(state: any) => void>;
  let capturedInterceptorListener: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    storeListeners = [];
    mockStoreState = {
      openedWindows: [],
    };

    mockStoreGetState = jest.fn(() => mockStoreState);
    mockStoreSubscribe = jest.fn((listener: (state: any) => void) => {
      storeListeners.push(listener);
      return () => {
        storeListeners = storeListeners.filter((l) => l !== listener);
      };
    });

    (getGlobalStore as jest.Mock).mockReturnValue({
      getState: mockStoreGetState,
      subscribe: mockStoreSubscribe,
    });

    (useServiceQueuesFilterState as jest.Mock).mockReturnValue({
      selectedServiceUuid: 'service-queue-uuid-1',
    });

    (installVisitSaveInterceptor as jest.Mock).mockImplementation((listener) => {
      capturedInterceptorListener = listener;
      return () => {
        capturedInterceptorListener = null;
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the button with label', () => {
    render(<AddPatientToQueueButton />);
    expect(screen.getByRole('button', { name: /Add patient to queue/i })).toBeInTheDocument();
  });

  it('launches queue-patient-search-workspace when clicked', () => {
    render(<AddPatientToQueueButton />);
    const button = screen.getByRole('button', { name: /Add patient to queue/i });
    fireEvent.click(button);

    expect(launchWorkspace2).toHaveBeenCalledWith(
      'queue-patient-search-workspace',
      expect.objectContaining({
        initialQuery: '',
        workspaceTitle: 'Add patient to queue',
        onPatientSelected: expect.any(Function),
      }),
      {
        startVisitWorkspaceName: 'queue-patient-search-start-visit-workspace',
      },
    );
  });

  it('launches create-queue-entry-workspace when onPatientSelected is called', () => {
    render(<AddPatientToQueueButton />);
    const button = screen.getByRole('button', { name: /Add patient to queue/i });
    fireEvent.click(button);

    const callArgs = (launchWorkspace2 as jest.Mock).mock.calls[0];
    const onPatientSelected = callArgs[1].onPatientSelected;
    const launchChildWorkspace = jest.fn();

    onPatientSelected('patient-1', { id: 'patient-1' } as any, launchChildWorkspace);

    expect(launchChildWorkspace).toHaveBeenCalledWith('create-queue-entry-workspace', {
      currentServiceQueueUuid: 'service-queue-uuid-1',
      selectedPatientUuid: 'patient-1',
    });
  });

  it('automatically transitions to create-queue-entry-workspace after visit is started in add-queue-entry flow', () => {
    render(<AddPatientToQueueButton />);

    expect(capturedInterceptorListener).toBeDefined();

    // 1. Simulate add-queue-entry window is open with start-visit workspace
    mockStoreState = {
      openedWindows: [
        {
          windowName: 'add-queue-entry',
          openedWorkspaces: [
            { workspaceName: 'queue-patient-search-workspace' },
            { workspaceName: 'queue-patient-search-start-visit-workspace' },
          ],
        },
      ],
    };

    // 2. Interceptor captures visit creation
    act(() => {
      capturedInterceptorListener({ patientUuid: 'new-patient-uuid' });
    });

    // 3. Visit form closes (queue-patient-search-start-visit-workspace is removed)
    act(() => {
      mockStoreState = {
        openedWindows: [
          {
            windowName: 'add-queue-entry',
            openedWorkspaces: [{ workspaceName: 'queue-patient-search-workspace' }],
          },
        ],
      };
      storeListeners.forEach((l) => l(mockStoreState));
    });

    // Advance 50ms transition debounce
    act(() => {
      jest.advanceTimersByTime(60);
    });

    // 4. Verifies SWR cache is invalidated and create-queue-entry-workspace is launched
    expect(mutate).toHaveBeenCalledWith(expect.any(Function));
    expect(launchWorkspace2).toHaveBeenCalledWith(
      'create-queue-entry-workspace',
      {
        currentServiceQueueUuid: 'service-queue-uuid-1',
        selectedPatientUuid: 'new-patient-uuid',
      },
      {
        startVisitWorkspaceName: 'queue-patient-search-start-visit-workspace',
      },
    );
  });

  it('does NOT trigger transition if add-queue-entry window is not open when visit was created', () => {
    render(<AddPatientToQueueButton />);

    mockStoreState = {
      openedWindows: [{ windowName: 'patient-chart', openedWorkspaces: [] }],
    };

    act(() => {
      capturedInterceptorListener({ patientUuid: 'unrelated-patient-uuid' });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(launchWorkspace2).not.toHaveBeenCalledWith(
      'create-queue-entry-workspace',
      expect.anything(),
      expect.anything(),
    );
  });
});
