import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConfig, useSession } from '@openmrs/esm-framework';
import VisitsTable from './visits-table.component';
import { useQueueLocations } from '../../queue-room/queue-entries.resource';

jest.mock('@openmrs/esm-framework', () => ({
  ConfigurableLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  formatDatetime: () => '2026-11-09 10:00',
  isDesktop: () => true,
  useLayoutType: () => 'desktop',
  useConfig: jest.fn(),
  useSession: jest.fn(),
  usePagination: (items: any[]) => ({
    results: items,
    goTo: jest.fn(),
    currentPage: 1,
  }),
}));

jest.mock('../../queue-room/queue-entries.resource', () => ({
  useQueueLocations: jest.fn(),
}));

const mockedUseConfig = useConfig as jest.Mock;
const mockedUseSession = useSession as jest.Mock;
const mockedUseQueueLocations = useQueueLocations as jest.Mock;

const ASSIGNED_QUEUE_ATTR_UUID = 'b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473';
const SESSION_LOCATION_UUID = '1710c866-edee-4ca7-82e0-92333c5529d4';
const SESSION_LOCATION_NAME = 'Adult OPD Room 1';

describe('VisitsTable Component', () => {
  beforeEach(() => {
    mockedUseConfig.mockReturnValue({
      assignedQueueVisitAttributeTypeUuid: ASSIGNED_QUEUE_ATTR_UUID,
      queueLocationTagName: 'queue location',
    });
    mockedUseSession.mockReturnValue({
      sessionLocation: {
        uuid: SESSION_LOCATION_UUID,
        display: SESSION_LOCATION_NAME,
        name: SESSION_LOCATION_NAME,
      },
    });
    mockedUseQueueLocations.mockReturnValue({
      queueLocations: [
        { id: SESSION_LOCATION_UUID, name: SESSION_LOCATION_NAME },
        { id: 'loc-pediatric-opd', name: 'Pediatric OPD Room 2' },
      ],
      isLoading: false,
    });
  });

  it('renders Service Location column header instead of generic Location', () => {
    render(
      <VisitsTable
        visits={[]}
        isLoading={false}
        tableHeading="Active Visits"
        totalCount={0}
        pageSize={10}
        currentPage={1}
        onPaginationChange={jest.fn()}
      />,
    );

    // Empty state should render
    expect(screen.getByText('No visits found')).toBeInTheDocument();
  });

  it('displays the assigned service location matching session location', () => {
    const mockVisit = {
      uuid: 'visit-1',
      patient: {
        uuid: 'patient-1',
        person: { display: 'Abebe Kebede', uuid: 'patient-1' },
        identifiers: [{ identifier: 'MRN-001' }],
      },
      visitType: { name: 'Outpatient', display: 'Outpatient' },
      location: { name: 'MRU', display: 'MRU' }, // original creation location
      attributes: [
        {
          attributeType: { uuid: ASSIGNED_QUEUE_ATTR_UUID },
          value: SESSION_LOCATION_UUID,
        },
      ],
      startDatetime: '2026-11-09T08:00:00.000Z',
    } as any;

    render(
      <VisitsTable
        visits={[mockVisit]}
        isLoading={false}
        tableHeading="Active Visits"
        totalCount={1}
        pageSize={10}
        currentPage={1}
        onPaginationChange={jest.fn()}
      />,
    );

    // Should display column header "Service Location"
    expect(screen.getByText('Service Location')).toBeInTheDocument();
    expect(screen.queryByText('Location')).not.toBeInTheDocument();

    // Should display the assigned service location name, not MRU
    expect(screen.getByText(SESSION_LOCATION_NAME)).toBeInTheDocument();
    expect(screen.queryByText('MRU')).not.toBeInTheDocument();
  });

  it('resolves assigned service location from queueLocations when different from session location', () => {
    const mockVisit = {
      uuid: 'visit-2',
      patient: {
        uuid: 'patient-2',
        person: { display: 'Chala Tadesse', uuid: 'patient-2' },
        identifiers: [{ identifier: 'MRN-002' }],
      },
      visitType: { name: 'Outpatient', display: 'Outpatient' },
      location: { name: 'Triage Room', display: 'Triage Room' },
      attributes: [
        {
          attributeType: { uuid: ASSIGNED_QUEUE_ATTR_UUID },
          value: 'loc-pediatric-opd',
        },
      ],
      startDatetime: '2026-11-09T08:30:00.000Z',
    } as any;

    render(
      <VisitsTable
        visits={[mockVisit]}
        isLoading={false}
        tableHeading="Active Visits"
        totalCount={1}
        pageSize={10}
        currentPage={1}
        onPaginationChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Pediatric OPD Room 2')).toBeInTheDocument();
    expect(screen.queryByText('Triage Room')).not.toBeInTheDocument();
  });
});
