import { renderHook, act } from '@testing-library/react';
import useSWR from 'swr';
import { useConfig, useSession } from '@openmrs/esm-framework';
import { usePatientAssignedQueue } from './use-patient-assigned-queue';
import { useQueueLocations } from '../queue-room/queue-entries.resource';

jest.mock('swr');
jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
  useConfig: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('../queue-room/queue-entries.resource', () => ({
  ...jest.requireActual('../queue-room/queue-entries.resource'),
  useQueueLocations: jest.fn(),
}));

const mockUseSWR = useSWR as jest.Mock;
const mockUseConfig = useConfig as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockUseQueueLocations = useQueueLocations as jest.Mock;

describe('usePatientAssignedQueue', () => {
  const ASSIGNED_QUEUE_ATTR_UUID = 'attr-assigned-queue-123';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseConfig.mockReturnValue({
      assignedQueueVisitAttributeTypeUuid: ASSIGNED_QUEUE_ATTR_UUID,
      queueLocationTagName: 'queue location',
    });

    mockUseSession.mockReturnValue({
      sessionLocation: { uuid: 'session-loc-uuid', display: 'Session Location' },
    });

    mockUseQueueLocations.mockReturnValue({
      queueLocations: [
        { id: 'loc-1', name: 'Emergency Location' },
        { id: 'loc-2', name: 'OPD Location' },
      ],
      isLoading: false,
    });
  });

  it('returns null displayQueue when patientUuid or activeVisit is missing', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => usePatientAssignedQueue(undefined, null));

    expect(result.current.displayQueue).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves queue name and location from active queue entry', () => {
    mockUseSWR.mockImplementation((url: string | null) => {
      if (url?.includes('/queue-entry')) {
        return {
          data: {
            data: {
              results: [
                {
                  startedAt: '2026-11-17T10:00:00Z',
                  endedAt: null,
                  queue: {
                    name: 'Adult OPD Queue',
                    location: { name: 'OPD Location' },
                  },
                },
              ],
            },
          },
          isLoading: false,
          error: undefined,
          mutate: jest.fn(),
        };
      }
      return { data: undefined, isLoading: false, mutate: jest.fn() };
    });

    const activeVisit = { uuid: 'visit-1', attributes: [] } as any;
    const { result } = renderHook(() => usePatientAssignedQueue('patient-1', activeVisit));

    expect(result.current.displayQueue).toBe('Adult OPD Queue (OPD Location)');
  });

  it('avoids duplicate location when queue name already contains the location name', () => {
    mockUseSWR.mockImplementation((url: string | null) => {
      if (url?.includes('/queue-entry')) {
        return {
          data: {
            data: {
              results: [
                {
                  startedAt: '2026-11-17T10:00:00Z',
                  endedAt: null,
                  queue: {
                    name: 'Emergency Triage',
                    location: { name: 'Emergency' },
                  },
                },
              ],
            },
          },
          isLoading: false,
          error: undefined,
          mutate: jest.fn(),
        };
      }
      return { data: undefined, isLoading: false, mutate: jest.fn() };
    });

    const activeVisit = { uuid: 'visit-1', attributes: [] } as any;
    const { result } = renderHook(() => usePatientAssignedQueue('patient-1', activeVisit));

    expect(result.current.displayQueue).toBe('Emergency Triage');
  });

  it('falls back to visit attribute when queue-entry returns no active entry', () => {
    mockUseSWR.mockImplementation((url: string | null) => {
      if (url?.includes('/queue-entry')) {
        return {
          data: { data: { results: [] } },
          isLoading: false,
          error: undefined,
          mutate: jest.fn(),
        };
      }
      return { data: undefined, isLoading: false, mutate: jest.fn() };
    });

    const activeVisit = {
      uuid: 'visit-1',
      attributes: [
        {
          attributeType: { uuid: ASSIGNED_QUEUE_ATTR_UUID },
          value: 'loc-1',
        },
      ],
    } as any;

    const { result } = renderHook(() => usePatientAssignedQueue('patient-1', activeVisit));

    expect(result.current.displayQueue).toBe('Emergency Location');
  });

  it('returns null displayQueue when neither queue entry nor visit attribute exists', () => {
    mockUseSWR.mockImplementation((url: string | null) => {
      if (url?.includes('/queue-entry')) {
        return {
          data: { data: { results: [] } },
          isLoading: false,
          error: undefined,
          mutate: jest.fn(),
        };
      }
      return { data: undefined, isLoading: false, mutate: jest.fn() };
    });

    const activeVisit = { uuid: 'visit-1', attributes: [] } as any;
    const { result } = renderHook(() => usePatientAssignedQueue('patient-1', activeVisit));

    expect(result.current.displayQueue).toBeNull();
  });

  it('mutates on queue-entry-updated window event', () => {
    const mutate = jest.fn();
    mockUseSWR.mockImplementation((url: string | null) => {
      if (url?.includes('/queue-entry')) {
        return {
          data: { data: { results: [] } },
          isLoading: false,
          error: undefined,
          mutate,
        };
      }
      return { data: undefined, isLoading: false, mutate: jest.fn() };
    });

    const activeVisit = { uuid: 'visit-1', attributes: [] } as any;
    renderHook(() => usePatientAssignedQueue('patient-1', activeVisit));

    act(() => {
      window.dispatchEvent(new CustomEvent('queue-entry-updated'));
    });

    expect(mutate).toHaveBeenCalled();
  });
});
