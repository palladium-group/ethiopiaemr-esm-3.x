import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateQueueEntryWorkspace from './create-queue-entry.workspace';
import {
  useConfig,
  useSession,
  usePatient,
  useVisit,
  showSnackbar,
  type Visit,
  type Patient,
} from '@openmrs/esm-framework';
import { useQueueLocations, useQueuePriorities, useQueues, useMutateQueueEntries } from '../queue-entries.resource';
import { postQueueEntry, setAssignedQueueVisitAttribute } from '../../triage/triage-queue-assignment.resource';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  showSnackbar: jest.fn(),
  useConfig: jest.fn(),
  useSession: jest.fn(),
  usePatient: jest.fn(),
  useVisit: jest.fn(),
  getPatientName: jest.fn(() => 'John Doe'),
  PatientPhoto: () => <div data-testid="patient-photo" />,
  PatientBannerPatientInfo: () => <div data-testid="patient-info">John Doe</div>,
  PatientBannerContactDetails: () => <div data-testid="patient-contact">Contact Details</div>,
  PatientBannerToggleContactDetailsButton: () => <button type="button">Toggle</button>,
}));

jest.mock('../queue-entries.resource', () => ({
  ...jest.requireActual('../queue-entries.resource'),
  useMutateQueueEntries: jest.fn(),
  useQueueLocations: jest.fn(),
  useQueuePriorities: jest.fn(),
  useQueues: jest.fn(),
}));

jest.mock('../../triage/triage-queue-assignment.resource', () => ({
  getErrorMessage: jest.fn((e) => e?.message ?? 'Error'),
  isDuplicateQueueEntryError: jest.fn(() => false),
  postQueueEntry: jest.fn(),
  setAssignedQueueVisitAttribute: jest.fn(),
}));

const mockUseConfig = useConfig as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockUsePatient = usePatient as jest.Mock;
const mockUseVisit = useVisit as jest.Mock;
const mockUseQueueLocations = useQueueLocations as jest.Mock;
const mockUseQueuePriorities = useQueuePriorities as jest.Mock;
const mockUseQueues = useQueues as jest.Mock;
const mockUseMutateQueueEntries = useMutateQueueEntries as jest.Mock;
const mockPostQueueEntry = postQueueEntry as jest.Mock;
const mockSetAssignedQueueVisitAttribute = setAssignedQueueVisitAttribute as jest.Mock;

const mockPatient: Patient = {
  id: 'patient-789',
  name: [{ given: ['John'], family: 'Doe' }],
} as unknown as Patient;

const mockVisit: Visit = {
  uuid: 'visit-123',
  patient: { uuid: 'patient-789' },
  attributes: [],
} as unknown as Visit;

describe('CreateQueueEntryWorkspace', () => {
  const closeWorkspace = jest.fn();
  const launchChildWorkspace = jest.fn();
  const mutateQueueEntries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSession.mockReturnValue({ sessionLocation: { uuid: 'loc-session' } });
    mockUsePatient.mockReturnValue({ patient: mockPatient, isLoading: false });
    mockUseVisit.mockReturnValue({ activeVisit: mockVisit, isLoading: false, error: null });
    mockUseMutateQueueEntries.mockReturnValue({ mutateQueueEntries });
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
          queueLocations: [{ id: 'loc-em-1', name: 'Emergency Room' }],
          isLoading: false,
        };
      }
      return {
        queueLocations: [{ id: 'loc-norm-1', name: 'General OPD Room' }],
        isLoading: false,
      };
    });

    mockUseQueues.mockImplementation((locationUuid?: string) => {
      if (locationUuid === 'loc-em-1') {
        return {
          queues: [{ uuid: 'queue-em-service', display: 'Emergency Service', name: 'Emergency Service' }],
          isLoading: false,
        };
      }
      if (locationUuid === 'loc-norm-1') {
        return {
          queues: [
            { uuid: 'queue-norm-service', display: 'General Doctor Service', name: 'General Doctor Service' },
            { uuid: 'queue-special-service', display: 'Specialist Service', name: 'Specialist Service' },
          ],
          isLoading: false,
        };
      }
      return { queues: [], isLoading: false };
    });
  });

  it('starts from Priority selection and defaults to Normal priority with queue location tag', async () => {
    render(
      <CreateQueueEntryWorkspace
        closeWorkspace={closeWorkspace}
        launchChildWorkspace={launchChildWorkspace}
        workspaceProps={{ selectedPatientUuid: 'patient-789' }}
      />,
    );

    // Priority selection is visible
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();

    // Location requested with 'queue location'
    expect(mockUseQueueLocations).toHaveBeenCalledWith('queue location');

    // Click location dropdown to see regular queue locations
    fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
    expect(screen.getByText('General OPD Room')).toBeInTheDocument();
    expect(screen.queryByText('Emergency Room')).not.toBeInTheDocument();
  });

  it('switches to emergency locations when emergency priority is selected in service queue workflow', async () => {
    render(
      <CreateQueueEntryWorkspace
        closeWorkspace={closeWorkspace}
        launchChildWorkspace={launchChildWorkspace}
        workspaceProps={{ selectedPatientUuid: 'patient-789' }}
      />,
    );

    // Select emergency priority
    fireEvent.click(screen.getByRole('radio', { name: 'Emergency' }));

    await waitFor(() => {
      expect(mockUseQueueLocations).toHaveBeenCalledWith('Emergency');
    });

    // Location dropdown now contains emergency locations
    fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
    expect(screen.getByText('Emergency Room')).toBeInTheDocument();
    expect(screen.queryByText('General OPD Room')).not.toBeInTheDocument();
  });

  it('allows completing queue entry with pre-selected service queue from service queue page', async () => {
    render(
      <CreateQueueEntryWorkspace
        closeWorkspace={closeWorkspace}
        launchChildWorkspace={launchChildWorkspace}
        workspaceProps={{
          selectedPatientUuid: 'patient-789',
          currentServiceQueueUuid: 'queue-special-service',
        }}
      />,
    );

    // Select location
    fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
    fireEvent.click(screen.getByRole('option', { name: /general opd room/i }));

    // Service dropdown should appear and pre-select queue-special-service
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('queue-special-service');
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /add patient to queue/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPostQueueEntry).toHaveBeenCalledWith(
        'visit-123',
        'queue-special-service',
        'patient-789',
        'priority-normal-uuid',
        'status-default-uuid',
        0, // Normal priority
        'loc-norm-1',
        'attr-queue-number',
      );
      expect(mockSetAssignedQueueVisitAttribute).toHaveBeenCalledWith(
        mockVisit,
        'attr-assigned-queue-uuid',
        'loc-norm-1',
      );
      expect(closeWorkspace).toHaveBeenCalledWith({ closeWindow: true, discardUnsavedChanges: true });
    });
  });

  it('submits with sortWeight = 1 when emergency priority is chosen', async () => {
    render(
      <CreateQueueEntryWorkspace
        closeWorkspace={closeWorkspace}
        launchChildWorkspace={launchChildWorkspace}
        workspaceProps={{ selectedPatientUuid: 'patient-789' }}
      />,
    );

    // Select emergency priority
    fireEvent.click(screen.getByRole('radio', { name: 'Emergency' }));

    // Select emergency location
    fireEvent.click(screen.getByRole('button', { name: /select a queue location/i }));
    fireEvent.click(screen.getByRole('option', { name: /emergency room/i }));

    // Select emergency service
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'queue-em-service' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /add patient to queue/i }));

    await waitFor(() => {
      expect(mockPostQueueEntry).toHaveBeenCalledWith(
        'visit-123',
        'queue-em-service',
        'patient-789',
        'priority-emergency-uuid',
        'status-default-uuid',
        1, // Emergency sortWeight
        'loc-em-1',
        'attr-queue-number',
      );
    });
  });
});
