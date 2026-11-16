import { getConfig, openmrsFetch } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { setAssignedQueueVisitAttribute } from '../triage/triage-queue-assignment.resource';
import {
  clearQueueLocationCache,
  getAssignedQueueAttributeTypeUuid,
  getQueueLocationUuid,
  resolveVisitForQueueTransition,
  syncQueueTransitionVisitAttribute,
  subscribeQueueTransitionSync,
} from './queue-transition-sync';

jest.mock('@openmrs/esm-framework', () => ({
  getConfig: jest.fn(),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

jest.mock('swr', () => ({
  mutate: jest.fn(),
}));

jest.mock('../triage/triage-queue-assignment.resource', () => ({
  setAssignedQueueVisitAttribute: jest.fn(),
}));

describe('queue-transition-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearQueueLocationCache();
  });

  describe('getQueueLocationUuid', () => {
    it('returns undefined if queueUuid is empty', async () => {
      expect(await getQueueLocationUuid('')).toBeUndefined();
      expect(openmrsFetch).not.toHaveBeenCalled();
    });

    it('fetches and returns location uuid from openmrsFetch', async () => {
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: {
          uuid: 'queue-1',
          location: { uuid: 'loc-123' },
        },
      });

      const loc = await getQueueLocationUuid('queue-1');
      expect(loc).toBe('loc-123');
      expect(openmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/queue/queue-1?v=custom:(uuid,location:(uuid))');

      // Caching verification: second call should not re-fetch
      const locCached = await getQueueLocationUuid('queue-1');
      expect(locCached).toBe('loc-123');
      expect(openmrsFetch).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when response does not contain location', async () => {
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: {
          uuid: 'queue-2',
        },
      });

      const loc = await getQueueLocationUuid('queue-2');
      expect(loc).toBeUndefined();
    });

    it('returns undefined and logs error when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (openmrsFetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const loc = await getQueueLocationUuid('queue-err');
      expect(loc).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAssignedQueueAttributeTypeUuid', () => {
    it('returns configured UUID when config has assignedQueueVisitAttributeTypeUuid', async () => {
      (getConfig as jest.Mock).mockResolvedValueOnce({
        assignedQueueVisitAttributeTypeUuid: 'custom-attr-uuid-999',
      });

      const uuid = await getAssignedQueueAttributeTypeUuid();
      expect(uuid).toBe('custom-attr-uuid-999');
    });

    it('falls back to default b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473 when not in config', async () => {
      (getConfig as jest.Mock).mockResolvedValueOnce({});

      const uuid = await getAssignedQueueAttributeTypeUuid();
      expect(uuid).toBe('b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473');
    });

    it('falls back to default when getConfig rejects', async () => {
      (getConfig as jest.Mock).mockRejectedValueOnce(new Error('Config error'));

      const uuid = await getAssignedQueueAttributeTypeUuid();
      expect(uuid).toBe('b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473');
    });
  });

  describe('resolveVisitForQueueTransition', () => {
    it('returns visit object immediately when visitUuid is present in details', async () => {
      const result = await resolveVisitForQueueTransition({
        newQueue: 'queue-new',
        visitUuid: 'visit-101',
      });

      expect(result).toEqual({ uuid: 'visit-101' });
      expect(openmrsFetch).not.toHaveBeenCalled();
    });

    it('fetches active visit for patient when patientUuid is present and visitUuid is missing', async () => {
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: {
          results: [{ uuid: 'active-visit-202' }],
        },
      });

      const result = await resolveVisitForQueueTransition({
        newQueue: 'queue-new',
        patientUuid: 'patient-abc',
      });

      expect(result).toEqual({ uuid: 'active-visit-202' });
      expect(openmrsFetch).toHaveBeenCalledWith(
        '/ws/rest/v1/visit?patient=patient-abc&includeInactive=false&v=custom:(uuid)',
      );
    });

    it('queries queue-entry when neither visitUuid nor patientUuid is provided', async () => {
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: {
          uuid: 'qe-1',
          visit: { uuid: 'visit-from-entry' },
        },
      });

      const result = await resolveVisitForQueueTransition({
        newQueue: 'queue-new',
        queueEntryToTransition: 'qe-1',
      });

      expect(result).toEqual({ uuid: 'visit-from-entry' });
      expect(openmrsFetch).toHaveBeenCalledWith(
        '/ws/rest/v1/queue-entry/qe-1?v=custom:(uuid,patient:(uuid),visit:(uuid))',
      );
    });

    it('resolves active visit via patient in queue-entry when entry only has patient', async () => {
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: {
          uuid: 'qe-2',
          patient: { uuid: 'patient-from-entry' },
        },
      });
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: {
          results: [{ uuid: 'visit-from-patient' }],
        },
      });

      const result = await resolveVisitForQueueTransition({
        newQueue: 'queue-new',
        queueEntryToTransition: 'qe-2',
      });

      expect(result).toEqual({ uuid: 'visit-from-patient' });
    });

    it('returns undefined when all resolutions fail', async () => {
      const result = await resolveVisitForQueueTransition({
        newQueue: 'queue-new',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('syncQueueTransitionVisitAttribute', () => {
    it('does nothing if newQueue is not provided', async () => {
      await syncQueueTransitionVisitAttribute({ newQueue: '' });
      expect(openmrsFetch).not.toHaveBeenCalled();
      expect(setAssignedQueueVisitAttribute).not.toHaveBeenCalled();
    });

    it('does nothing if queue location cannot be resolved', async () => {
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: { uuid: 'queue-no-loc' },
      });

      await syncQueueTransitionVisitAttribute({ newQueue: 'queue-no-loc' });
      expect(setAssignedQueueVisitAttribute).not.toHaveBeenCalled();
    });

    it('updates visit attribute, invalidates SWR cache and dispatches events on success', async () => {
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

      // 1. Queue location
      (openmrsFetch as jest.Mock).mockResolvedValueOnce({
        data: { uuid: 'queue-target', location: { uuid: 'loc-target' } },
      });
      // 2. Config lookup
      (getConfig as jest.Mock).mockResolvedValueOnce({
        assignedQueueVisitAttributeTypeUuid: 'attr-type-123',
      });

      (setAssignedQueueVisitAttribute as jest.Mock).mockResolvedValueOnce(undefined);

      await syncQueueTransitionVisitAttribute({
        newQueue: 'queue-target',
        visitUuid: 'visit-tgt',
      });

      expect(setAssignedQueueVisitAttribute).toHaveBeenCalledWith({ uuid: 'visit-tgt' }, 'attr-type-123', 'loc-target');

      expect(mutate).toHaveBeenCalledWith(expect.any(Function));
      // Test the mutate predicate
      const mutateFilter = (mutate as jest.Mock).mock.calls[0][0];
      expect(mutateFilter('/ws/rest/v1/visit/123')).toBe(true);
      expect(mutateFilter('/ws/rest/v1/patient/123')).toBe(false);

      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'visit-updated' }));
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'queue-entry-updated' }));

      dispatchEventSpy.mockRestore();
    });
  });

  describe('subscribeQueueTransitionSync', () => {
    it('subscribes and cleans up cleanly', () => {
      const unsubscribe1 = subscribeQueueTransitionSync();
      expect(typeof unsubscribe1).toBe('function');

      const unsubscribe2 = subscribeQueueTransitionSync();
      expect(typeof unsubscribe2).toBe('function');

      unsubscribe1();
      unsubscribe2();

      const unsubscribe3 = subscribeQueueTransitionSync();
      expect(typeof unsubscribe3).toBe('function');
      unsubscribe3();
    });
  });
});
