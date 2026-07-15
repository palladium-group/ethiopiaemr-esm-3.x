import React from 'react';
import { render, screen } from '@testing-library/react';
import ElectiveSurgeryScheduleTable from './elective-surgery-schedule-table.component';
import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';

jest.mock('@openmrs/esm-framework', () => ({
  formatDatetime: jest.fn(() => 'Jan 1, 2026'),
  fetchCurrentPatient: jest.fn(),
  launchWorkspace2: jest.fn(),
  showSnackbar: jest.fn(),
  useConfig: jest.fn(() => ({ admissionRequestFormUuid: 'form-uuid' })),
  useSWRConfig: jest.fn(() => ({ mutate: jest.fn() })),
  ConfigurableLink: ({ children }: { children: React.ReactNode }) => <a href="/patient">{children}</a>,
}));

jest.mock('./elective-surgery-schedule-actions.hook', () => ({
  useElectiveSurgeryScheduleActions: jest.fn(() => ({
    canManageSchedule: true,
    canRecordContact: true,
    canRemovePatient: false,
    viewAdmissionRequest: jest.fn(),
    recordContactOutcome: jest.fn(),
    markReady: jest.fn(),
    returnFromAdmission: jest.fn(),
    removePatient: jest.fn(),
  })),
}));

const scheduleItem: ElectiveSurgeryScheduleItem = {
  uuid: 'schedule-1',
  patient: {
    uuid: 'patient-1',
    display: 'John Doe',
    identifiers: [{ identifier: 'MRN123', type: { display: 'OpenMRS ID' } }],
  },
  requestDate: '2026-01-01T10:00:00.000Z',
  priority: 'ELECTIVE_A',
  currentCategory: 'A',
  daysLeft: 10,
  scheduleStatus: 'PENDING_COMMUNICATION',
  anesthesiaStatus: 'FIT_FOR_SURGERY',
  lastContactOutcome: 'NO_ATTEMPT_YET',
  admissionRequestEncounterUuid: 'encounter-1',
  removed: false,
};

describe('ElectiveSurgeryScheduleTable', () => {
  it('renders patient and status columns', () => {
    render(<ElectiveSurgeryScheduleTable schedules={[scheduleItem]} onActionComplete={jest.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('MRN123')).toBeInTheDocument();
    expect(screen.getByText('Pending communication')).toBeInTheDocument();
    expect(screen.getByText('Fit for surgery')).toBeInTheDocument();
    expect(screen.queryByText('Remove patient')).not.toBeInTheDocument();
  });
});
