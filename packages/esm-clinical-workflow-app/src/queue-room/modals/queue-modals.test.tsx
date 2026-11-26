import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getGlobalStore, showSnackbar, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import type { QueueEntry } from '../../types';
import { postQueueEntry, setAssignedQueueVisitAttribute } from '../../triage/triage-queue-assignment.resource';
import {
  transitionQueueEntry,
  useLatestQueueEntry,
  useMutateQueueEntries,
  useQueueEntries,
  useQueueEntry,
  useQueueLocations,
  useQueuePriorities,
  useQueues,
} from '../queue-entries.resource';
import MoveQueueEntryModal from './move-queue-entry.modal';
import TransitionPatientToLatestQueueModal from './transition-patient-to-latest-queue.modal';
import { registerQueueModalsOverride } from './register-queue-modals-override';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  getCoreTranslation: jest.fn((key: string) => key),
  getGlobalStore: jest.fn(),
  OpenmrsDatePicker: ({ id, labelText, value, onChange }: any) => (
    <div>
      <label htmlFor={id}>{labelText}</label>
      <input
        id={id}
        type="text"
        value={value instanceof Date ? value.toISOString().slice(0, 10) : value || ''}
        onChange={(e) => onChange(new Date(e.target.value))}
      />
    </div>
  ),
  showSnackbar: jest.fn(),
  useConfig: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('../queue-entries.resource', () => ({
  ...jest.requireActual('../queue-entries.resource'),
  transitionQueueEntry: jest.fn(),
  useLatestQueueEntry: jest.fn(),
  useMutateQueueEntries: jest.fn(),
  useQueueEntry: jest.fn(),
  useQueueLocations: jest.fn(),
  useQueuePriorities: jest.fn(),
  useQueues: jest.fn(),
}));

jest.mock('../../triage/triage-queue-assignment.resource', () => ({
  getErrorMessage: jest.fn((e) => e?.message ?? 'Error'),
  isDuplicateQueueEntryError: jest.fn((e) => Boolean(e?.duplicate)),
  postQueueEntry: jest.fn(),
  setAssignedQueueVisitAttribute: jest.fn(),
}));

const mockUseConfig = useConfig as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockGetGlobalStore = getGlobalStore as jest.Mock;
const mockUseQueueEntry = useQueueEntry as jest.Mock;
const mockUseLatestQueueEntry = useLatestQueueEntry as jest.Mock;
const mockUseMutateQueueEntries = useMutateQueueEntries as jest.Mock;
const mockUseQueueLocations = useQueueLocations as jest.Mock;
const mockUseQueuePriorities = useQueuePriorities as jest.Mock;
const mockUseQueues = useQueues as jest.Mock;
const mockTransitionQueueEntry = transitionQueueEntry as jest.Mock;
const mockPostQueueEntry = postQueueEntry as jest.Mock;
const mockSetAssignedQueueVisitAttribute = setAssignedQueueVisitAttribute as jest.Mock;

const mockQueueEntry: QueueEntry = {
  uuid: 'qe-1',
  display: 'Abebe Bikila',
  startedAt: '2026-11-25T08:00:00.000Z',
  priority: { uuid: 'priority-normal-uuid', display: 'Normal' },
  status: { uuid: 'status-default-uuid', display: 'Waiting' },
  priorityComment: '',
  queue: {
    uuid: 'queue-norm-1',
    display: 'OPD 1',
    name: 'OPD 1',
    location: { uuid: 'loc-norm-1', display: 'General OPD Room' },
  },
  visit: { uuid: 'visit-1' },
} as unknown as QueueEntry;

const mockVisit: Visit = {
  uuid: 'visit-1',
  patient: { uuid: 'patient-1' },
  attributes: [],
} as unknown as Visit;

describe('Queue selector modals (Move & Transition to latest queue)', () => {
  const closeModal = jest.fn();
  const mutateQueueEntries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSession.mockReturnValue({ sessionLocation: { uuid: 'loc-norm-1' } });
    mockUseMutateQueueEntries.mockReturnValue({ mutateQueueEntries });
    mockUseQueueEntry.mockReturnValue({ queueEntry: mockQueueEntry, error: null, isLoading: false });
    mockUseLatestQueueEntry.mockReturnValue({ data: null, error: null, isLoading: false });
    mockTransitionQueueEntry.mockResolvedValue({ status: 200 });
    mockPostQueueEntry.mockResolvedValue({ ok: true });
    mockSetAssignedQueueVisitAttribute.mockResolvedValue({});

    mockUseConfig.mockImplementation((opts?: { externalModuleName?: string }) => {
      if (opts?.externalModuleName === '@openmrs/esm-service-queues-app') {
        return {
          visitQueueNumberAttributeUuid: 'attr-queue-number',
          concepts: {
            defaultStatusConceptUuid: 'status-default-uuid',
            defaultPriorityConceptUuid: 'priority-normal-uuid',
            emergencyPriorityConceptUuid: 'priority-emergency-uuid',
            priorityConceptSetUuid: 'priority-concept-set-uuid',
          },
        };
      }
      return {
        assignedQueueVisitAttributeTypeUuid: 'attr-assigned-queue-uuid',
        emergencyLocationTags: ['Emergency'],
        queueLocationTagName: 'queue location',
      };
    });

    mockUseQueuePriorities.mockReturnValue({
      priorities: [
        { uuid: 'priority-normal-uuid', display: 'Normal' },
        { uuid: 'priority-emergency-uuid', display: 'Emergency' },
      ],
      isLoadingQueuePriorities: false,
    });

    mockUseQueueLocations.mockImplementation((tag: string) => {
      if (tag === 'Emergency') {
        return {
          queueLocations: [{ id: 'loc-em-1', name: 'Emergency Room' }],
          isLoading: false,
        };
      }
      return {
        queueLocations: [
          { id: 'loc-norm-1', name: 'General OPD Room' },
          { id: 'loc-norm-2', name: 'Pediatric Room' },
        ],
        isLoading: false,
      };
    });

    mockUseQueues.mockImplementation((locationUuid?: string) => {
      if (locationUuid === 'loc-em-1') {
        return {
          queues: [
            {
              uuid: 'queue-em-service',
              display: 'Emergency Service',
              name: 'Emergency Service',
              allowedStatuses: [{ uuid: 'status-default-uuid', display: 'Waiting' }],
            },
          ],
          isLoading: false,
        };
      }
      if (locationUuid === 'loc-norm-1') {
        return {
          queues: [
            {
              uuid: 'queue-norm-1',
              display: 'OPD 1',
              name: 'OPD 1',
              allowedStatuses: [{ uuid: 'status-default-uuid', display: 'Waiting' }],
            },
            {
              uuid: 'queue-norm-2',
              display: 'OPD 2',
              name: 'OPD 2',
              allowedStatuses: [{ uuid: 'status-default-uuid', display: 'Waiting' }],
            },
          ],
          isLoading: false,
        };
      }
      return { queues: [], isLoading: false };
    });
  });

  describe('MoveQueueEntryModal', () => {
    it('warns and refreshes queue entries if the entry was already ended', () => {
      mockUseQueueEntry.mockReturnValue({
        queueEntry: { ...mockQueueEntry, endedAt: '2026-11-25T09:00:00.000Z' },
        error: null,
        isLoading: false,
      });

      render(<MoveQueueEntryModal queueEntry={mockQueueEntry} closeModal={closeModal} />);

      expect(screen.getByText('Queue entry is no longer active')).toBeInTheDocument();
      expect(mutateQueueEntries).toHaveBeenCalled();
    });

    it('renders Priority -> Emergency-filtered Queue location -> Service and transitions on submit', async () => {
      render(<MoveQueueEntryModal queueEntry={mockQueueEntry} closeModal={closeModal} />);

      // Current queue is marked and selected initially
      expect(screen.getByRole('option', { name: 'OPD 1 (Current)' })).toBeInTheDocument();
      const submitBtn = screen.getByRole('button', { name: 'Move' });
      expect(submitBtn).toBeDisabled();

      // Switch to Emergency priority -> location resets and shows Emergency locations
      fireEvent.click(screen.getByRole('radio', { name: 'Emergency' }));

      const locationTrigger = document.getElementById('move-queue-location-trigger')!;
      expect(locationTrigger).toHaveTextContent('Select a queue location');

      fireEvent.click(locationTrigger);
      expect(screen.queryByRole('option', { name: 'General OPD Room' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('option', { name: 'Emergency Room' }));

      const serviceSelect = document.getElementById('move-queue-service') as HTMLSelectElement;
      fireEvent.change(serviceSelect, { target: { value: 'queue-em-service' } });
      fireEvent.change(document.getElementById('move-queue-priority-comment')!, {
        target: { value: 'Urgent transfer' },
      });

      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockTransitionQueueEntry).toHaveBeenCalledWith({
          queueEntryToTransition: 'qe-1',
          newQueue: 'queue-em-service',
          newStatus: 'status-default-uuid',
          newPriority: 'priority-emergency-uuid',
          newPriorityComment: 'Urgent transfer',
        });
      });
      expect(mutateQueueEntries).toHaveBeenCalled();
      expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('TransitionPatientToLatestQueueModal', () => {
    it('delegates to MoveQueueEntryModal when patient has an active queue entry', () => {
      mockUseLatestQueueEntry.mockReturnValue({ data: mockQueueEntry, error: null, isLoading: false });

      render(<TransitionPatientToLatestQueueModal activeVisit={mockVisit} closeModal={closeModal} />);

      expect(screen.getByText('Move Abebe Bikila')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'OPD 1 (Current)' })).toBeInTheDocument();
    });

    it('renders the latest queue selector when adding a linked patient with no active queue entry', async () => {
      mockUseLatestQueueEntry.mockReturnValue({ data: null, error: null, isLoading: false });

      render(<TransitionPatientToLatestQueueModal activeVisit={mockVisit} closeModal={closeModal} />);

      expect(screen.getByRole('heading', { name: 'Add patient to queue' })).toBeInTheDocument();

      // Switch to Emergency priority -> selects Emergency Room -> selects Emergency Service -> submits sortWeight = 1
      fireEvent.click(screen.getByRole('radio', { name: 'Emergency' }));
      fireEvent.click(document.getElementById('transition-latest-queue-location-trigger')!);
      fireEvent.click(screen.getByRole('option', { name: 'Emergency Room' }));
      fireEvent.change(document.getElementById('transition-latest-queue-service')!, {
        target: { value: 'queue-em-service' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Add patient to queue' }));

      await waitFor(() => {
        expect(mockPostQueueEntry).toHaveBeenCalledWith(
          'visit-1',
          'queue-em-service',
          'patient-1',
          'priority-emergency-uuid',
          'status-default-uuid',
          1,
          'loc-em-1',
          'attr-queue-number',
        );
      });
      expect(mockSetAssignedQueueVisitAttribute).toHaveBeenCalledWith(
        mockVisit,
        'attr-assigned-queue-uuid',
        'loc-em-1',
      );
      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('registerQueueModalsOverride', () => {
    it('replaces upstream move and transition modal entries when our custom modals are registered', () => {
      const moveLoader = jest.fn();
      const transitionLoader = jest.fn();
      let storeState: any = {
        modals: {
          'ethiopia-move-queue-entry-modal': {
            name: 'ethiopia-move-queue-entry-modal',
            load: moveLoader,
            moduleName: '@palladium-ethiopia/esm-clinical-workflow-app',
          },
          'ethiopia-transition-patient-to-latest-queue-modal': {
            name: 'ethiopia-transition-patient-to-latest-queue-modal',
            load: transitionLoader,
            moduleName: '@palladium-ethiopia/esm-clinical-workflow-app',
          },
          'move-queue-entry-modal': {
            name: 'move-queue-entry-modal',
            load: jest.fn(),
            moduleName: '@openmrs/esm-service-queues-app',
          },
        },
      };

      mockGetGlobalStore.mockReturnValue({
        getState: () => storeState,
        setState: (next: any) => {
          storeState = { ...storeState, ...next };
        },
        subscribe: jest.fn(),
      });

      registerQueueModalsOverride();

      expect(storeState.modals['move-queue-entry-modal']).toEqual({
        name: 'move-queue-entry-modal',
        load: moveLoader,
        moduleName: '@palladium-ethiopia/esm-clinical-workflow-app',
      });
      expect(storeState.modals['transition-patient-to-latest-queue-modal']).toEqual({
        name: 'transition-patient-to-latest-queue-modal',
        load: transitionLoader,
        moduleName: '@palladium-ethiopia/esm-clinical-workflow-app',
      });
    });
  });
});
