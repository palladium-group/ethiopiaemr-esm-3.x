import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TriageQueueAssignmentModal from './triage-queue-assignment.modal';
import { useConfig, useSession, showSnackbar, type Visit } from '@openmrs/esm-framework';
import {
  useQueueLocations,
  useQueuePriorities,
  useQueues,
  useMutateQueueEntries,
} from '../queue-room/queue-entries.resource';
import {
  postQueueEntry,
  setAssignedQueueVisitAttribute,
  useTriageAssignmentCounts,
} from './triage-queue-assignment.resource';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  showSnackbar: jest.fn(),
  useConfig: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('../queue-room/queue-entries.resource', () => ({
  ...jest.requireActual('../queue-room/queue-entries.resource'),
  useMutateQueueEntries: jest.fn(),
  useQueueLocations: jest.fn(),
  useQueuePriorities: jest.fn(),
  useQueues: jest.fn(),
}));

jest.mock('./triage-queue-assignment.resource', () => ({
  getErrorMessage: jest.fn((e) => e?.message ?? 'Error'),
  isDuplicateQueueEntryError: jest.fn(() => false),
  postQueueEntry: jest.fn(),
  setAssignedQueueVisitAttribute: jest.fn(),
  useTriageAssignmentCounts: jest.fn(),
}));

const mockUseConfig = useConfig as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockUseQueueLocations = useQueueLocations as jest.Mock;
const mockUseQueuePriorities = useQueuePriorities as jest.Mock;
const mockUseQueues = useQueues as jest.Mock;
const mockUseMutateQueueEntries = useMutateQueueEntries as jest.Mock;
const mockUseTriageAssignmentCounts = useTriageAssignmentCounts as jest.Mock;
const mockPostQueueEntry = postQueueEntry as jest.Mock;
const mockSetAssignedQueueVisitAttribute = setAssignedQueueVisitAttribute as jest.Mock;

const mockVisit: Visit = {
  uuid: 'visit-123',
  patient: { uuid: 'patient-456' },
  attributes: [],
} as unknown as Visit;

describe('TriageQueueAssignmentModal', () => {
  const closeModal = jest.fn();
  const mutateQueueEntries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSession.mockReturnValue({ sessionLocation: { uuid: 'loc-session' } });
    mockUseMutateQueueEntries.mockReturnValue({ mutateQueueEntries });
    mockUseTriageAssignmentCounts.mockReturnValue({ byLocationUuid: {}, isLoading: false });
    mockPostQueueEntry.mockResolvedValue({});
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
        triageVisitAttributeTypeUuid: 'attr-triage-uuid',
        emergencyLocationTags: ['Emergency'],
        emergencyLocationTagUuid: 'aa045812-4237-450e-8443-6294587323e8',
        queueLocationTagName: 'queue location',
        triageDefinitions: [
          { id: 'adult', name: 'Adult Triage Form', displayName: 'Adult Triage' },
          {
            id: 'emergency',
            name: 'Emergency Triage Form',
            displayName: 'Emergency Triage',
            routePath: 'emergency-triage',
          },
        ],
      };
    });

    mockUseQueuePriorities.mockReturnValue({
      priorities: [
        { uuid: 'priority-normal-uuid', display: 'Normal' },
        { uuid: 'priority-urgent-uuid', display: 'Urgent' },
        { uuid: 'priority-emergency-uuid', display: 'Emergency' },
      ],
      isLoadingQueuePriorities: false,
    });

    mockUseQueueLocations.mockImplementation((tag: string) => {
      if (tag === 'Emergency') {
        return {
          queueLocations: [
            { id: 'loc-em-1', name: 'Red Resuscitation Room' },
            { id: 'loc-em-2', name: 'Emergency OPD' },
          ],
          isLoading: false,
        };
      }
      return {
        queueLocations: [
          { id: 'loc-norm-1', name: 'General OPD Location 1' },
          { id: 'loc-norm-2', name: 'General OPD Location 2' },
        ],
        isLoading: false,
      };
    });

    mockUseQueues.mockImplementation((locationUuid?: string) => {
      if (locationUuid === 'loc-em-1') {
        return {
          queues: [{ uuid: 'queue-em-service', display: 'Emergency Care Service', name: 'Emergency Care Service' }],
          isLoading: false,
        };
      }
      if (locationUuid === 'loc-norm-1') {
        return {
          queues: [{ uuid: 'queue-norm-service', display: 'General Doctor Service', name: 'General Doctor Service' }],
          isLoading: false,
        };
      }
      return { queues: [], isLoading: false };
    });
  });

  describe('when in Emergency triage', () => {
    it('does not display priority selection and lists all queue locations using previous location logic', async () => {
      render(<TriageQueueAssignmentModal activeVisit={mockVisit} triageId="emergency" closeModal={closeModal} />);

      // Priority field should NOT be displayed on UI
      expect(screen.queryByText('Normal')).not.toBeInTheDocument();
      expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
      expect(screen.queryByText('Priority')).not.toBeInTheDocument();

      // Locations should be requested with 'queue location' tag (all locations as previous location logic)
      expect(mockUseQueueLocations).toHaveBeenCalledWith('queue location');

      // Click location trigger to view queue locations
      const locationTrigger = screen.getByRole('button', { name: /select a queue location/i });
      fireEvent.click(locationTrigger);

      expect(screen.getByText('General OPD Location 1')).toBeInTheDocument();
      expect(screen.getByText('General OPD Location 2')).toBeInTheDocument();
    });

    it('allows selecting a location and service, then submits with emergency priority and sortWeight = 1', async () => {
      render(<TriageQueueAssignmentModal activeVisit={mockVisit} triageId="emergency" closeModal={closeModal} />);

      // Select location
      fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
      fireEvent.click(screen.getByRole('option', { name: /general opd location 1/i }));

      // Service dropdown should now appear
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Select the service
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'queue-norm-service' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add patient to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPostQueueEntry).toHaveBeenCalledWith(
          'visit-123',
          'queue-norm-service',
          'patient-456',
          'priority-emergency-uuid',
          'status-default-uuid',
          1, // sortWeight = 1 for emergency
          'loc-norm-1',
          'attr-queue-number',
        );
        expect(mockSetAssignedQueueVisitAttribute).toHaveBeenCalledWith(
          mockVisit,
          'attr-assigned-queue-uuid',
          'loc-norm-1',
        );
        expect(closeModal).toHaveBeenCalled();
      });
    });
  });

  describe('when NOT in Emergency triage (e.g. Adult Triage)', () => {
    it('displays priority selection first and defaults to normal queue locations', async () => {
      render(<TriageQueueAssignmentModal activeVisit={mockVisit} triageId="adult" closeModal={closeModal} />);

      // Priority field SHOULD be displayed
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Normal' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Urgent' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Emergency' })).toBeInTheDocument();

      // Normal is selected by default (defaultPriorityConceptUuid)
      expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();

      // Locations should be requested with 'queue location' tag
      expect(mockUseQueueLocations).toHaveBeenCalledWith('queue location');

      // Click location trigger to view normal queue locations
      fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
      expect(screen.getByText('General OPD Location 1')).toBeInTheDocument();
      expect(screen.queryByText('Red Resuscitation Room')).not.toBeInTheDocument();
    });

    it('switches to emergency locations when emergency priority is selected by the user', async () => {
      render(<TriageQueueAssignmentModal activeVisit={mockVisit} triageId="adult" closeModal={closeModal} />);

      // Initial tag is 'queue location'
      expect(mockUseQueueLocations).toHaveBeenCalledWith('queue location');

      // Click Emergency priority radio button
      const emergencyRadio = screen.getByRole('radio', { name: 'Emergency' });
      fireEvent.click(emergencyRadio);

      // Now locations should be requested with 'Emergency' tag
      await waitFor(() => {
        expect(mockUseQueueLocations).toHaveBeenCalledWith('Emergency');
      });

      // Click location trigger
      fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
      expect(screen.getByText('Red Resuscitation Room')).toBeInTheDocument();
      expect(screen.queryByText('General OPD Location 1')).not.toBeInTheDocument();
    });

    it('submits with normal priority and sortWeight = 0 when normal priority is selected', async () => {
      render(<TriageQueueAssignmentModal activeVisit={mockVisit} triageId="adult" closeModal={closeModal} />);

      // Normal is selected by default
      expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();

      // Select normal location
      fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
      fireEvent.click(screen.getByRole('option', { name: /general opd location 1/i }));

      // Select service
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'queue-norm-service' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /add patient to queue/i }));

      await waitFor(() => {
        expect(mockPostQueueEntry).toHaveBeenCalledWith(
          'visit-123',
          'queue-norm-service',
          'patient-456',
          'priority-normal-uuid',
          'status-default-uuid',
          0, // sortWeight = 0 for non-emergency
          'loc-norm-1',
          'attr-queue-number',
        );
        expect(closeModal).toHaveBeenCalled();
      });
    });
  });
});
