import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useVisit } from '@openmrs/esm-framework';
import PatientBanner from './patient-banner.component';
import { useStartVisitAndLaunchTriageForm } from './useStartVisitAndLaunchTriageForm';
import { usePatientAssignedQueue } from './use-patient-assigned-queue';
import type { TriageDefinitionConfig } from '../config-schema';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  usePatient: jest.fn(),
  useVisit: jest.fn(),
  UserHasAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ExtensionSlot: ({ name }: { name: string }) => <div data-testid={name} />,
}));

jest.mock('./useStartVisitAndLaunchTriageForm', () => ({
  useStartVisitAndLaunchTriageForm: jest.fn(),
}));

jest.mock('./use-patient-assigned-queue', () => ({
  usePatientAssignedQueue: jest.fn(),
}));

const mockUsePatient = usePatient as jest.Mock;
const mockUseVisit = useVisit as jest.Mock;
const mockUseStartVisitAndLaunchTriageForm = useStartVisitAndLaunchTriageForm as jest.Mock;
const mockUsePatientAssignedQueue = usePatientAssignedQueue as jest.Mock;

const mockVariantConfig: TriageDefinitionConfig = {
  id: 'adult',
  name: 'Adult Triage Form',
  displayName: 'Adult Triage',
  formUuid: 'form-uuid-123',
  enabled: true,
  order: 1,
  privilege: 'ViewAdultTriageDashboard',
};

const mockPatient = {
  id: 'patient-uuid-1',
  name: [{ given: ['John'], family: 'Doe' }],
} as any;

describe('PatientBanner', () => {
  const setPatientUuid = jest.fn();
  const handleStartVisitAndLaunchTriageForm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStartVisitAndLaunchTriageForm.mockReturnValue({
      handleStartVisitAndLaunchTriageForm,
      isLoading: false,
      error: null,
    });
  });

  it('renders loading indicator when patient or visit is loading', () => {
    mockUsePatient.mockReturnValue({ isLoading: true, patient: null });
    mockUseVisit.mockReturnValue({ isLoading: true, activeVisit: null });
    mockUsePatientAssignedQueue.mockReturnValue({ displayQueue: null, isLoading: false });

    render(
      <PatientBanner patientUuid="patient-uuid-1" variantConfig={mockVariantConfig} setPatientUuid={setPatientUuid} />,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  describe('when patient has NO active visit', () => {
    beforeEach(() => {
      mockUsePatient.mockReturnValue({ isLoading: false, patient: mockPatient });
      mockUseVisit.mockReturnValue({ isLoading: false, activeVisit: null });
      mockUsePatientAssignedQueue.mockReturnValue({ displayQueue: null, isLoading: false });
    });

    it('enables the triage form button and does not show active visit alert', () => {
      render(
        <PatientBanner
          patientUuid="patient-uuid-1"
          variantConfig={mockVariantConfig}
          setPatientUuid={setPatientUuid}
        />,
      );

      const triageButton = screen.getByRole('button', { name: /triage form/i });
      expect(triageButton).toBeEnabled();
      expect(screen.queryByText(/patient already has an active visit/i)).not.toBeInTheDocument();
    });

    it('triggers handleStartVisitAndLaunchTriageForm when clicking triage form button', async () => {
      const user = userEvent.setup();
      render(
        <PatientBanner
          patientUuid="patient-uuid-1"
          variantConfig={mockVariantConfig}
          setPatientUuid={setPatientUuid}
        />,
      );

      const triageButton = screen.getByRole('button', { name: /triage form/i });
      await user.click(triageButton);

      expect(handleStartVisitAndLaunchTriageForm).toHaveBeenCalledWith(
        'patient-uuid-1',
        'form-uuid-123',
        'Adult Triage Form',
        'adult',
      );
    });
  });

  describe('when patient HAS an active visit', () => {
    const mockActiveVisit = {
      uuid: 'visit-123',
      patient: { uuid: 'patient-uuid-1' },
    } as any;

    beforeEach(() => {
      mockUsePatient.mockReturnValue({ isLoading: false, patient: mockPatient });
      mockUseVisit.mockReturnValue({ isLoading: false, activeVisit: mockActiveVisit });
      mockUsePatientAssignedQueue.mockReturnValue({
        displayQueue: 'Emergency Triage (Emergency)',
        isLoading: false,
      });
    });

    it('disables the triage form button and does not launch triage form on click', async () => {
      render(
        <PatientBanner
          patientUuid="patient-uuid-1"
          variantConfig={mockVariantConfig}
          setPatientUuid={setPatientUuid}
        />,
      );

      const triageButton = screen.getByRole('button', { name: /triage form/i });
      expect(triageButton).toBeDisabled();

      fireEvent.click(triageButton);
      expect(handleStartVisitAndLaunchTriageForm).not.toHaveBeenCalled();
    });

    it('displays the active visit alert message and currently assigned queue', () => {
      render(
        <PatientBanner
          patientUuid="patient-uuid-1"
          variantConfig={mockVariantConfig}
          setPatientUuid={setPatientUuid}
        />,
      );

      expect(screen.getByText('Patient already has an active visit')).toBeInTheDocument();
      expect(
        screen.getByText(/this patient already has an active visit and cannot be triaged again/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/emergency triage \(emergency\)/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /go to service queues/i })).not.toBeInTheDocument();
    });

    it('displays "Not assigned to any queue" when the patient is not assigned to any queue', () => {
      mockUsePatientAssignedQueue.mockReturnValue({
        displayQueue: null,
        isLoading: false,
      });

      render(
        <PatientBanner
          patientUuid="patient-uuid-1"
          variantConfig={mockVariantConfig}
          setPatientUuid={setPatientUuid}
        />,
      );

      expect(screen.getByText('Not assigned to any queue')).toBeInTheDocument();
    });
  });

  it('calls setPatientUuid(undefined) when clicking the close button', async () => {
    mockUsePatient.mockReturnValue({ isLoading: false, patient: mockPatient });
    mockUseVisit.mockReturnValue({ isLoading: false, activeVisit: null });
    mockUsePatientAssignedQueue.mockReturnValue({ displayQueue: null, isLoading: false });

    const user = userEvent.setup();
    render(
      <PatientBanner patientUuid="patient-uuid-1" variantConfig={mockVariantConfig} setPatientUuid={setPatientUuid} />,
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(setPatientUuid).toHaveBeenCalledWith(undefined);
  });
});
