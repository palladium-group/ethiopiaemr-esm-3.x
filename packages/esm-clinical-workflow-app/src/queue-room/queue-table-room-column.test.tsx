import React from 'react';
import { render, screen } from '@testing-library/react';
import QueueTableRoomColumn from './queue-table-room-column.component';
import {
  findAssignedRoomName,
  getVisitQueueNumber,
  useActiveTicketAssignments,
  useServiceQueuesConfig,
} from './queue-room.resource';
import { getColumnHeader } from './filtered-queue-table-cells';
import type { QueueEntry } from '../types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, defaultValue: string) => defaultValue }),
}));

jest.mock('./queue-room.resource', () => ({
  findAssignedRoomName: jest.fn(),
  getVisitQueueNumber: jest.fn(),
  useActiveTicketAssignments: jest.fn(),
  useServiceQueuesConfig: jest.fn(),
}));

describe('QueueTableRoomColumn', () => {
  const mockQueueEntry = { uuid: 'entry-1' } as QueueEntry;

  beforeEach(() => {
    jest.clearAllMocks();
    (useServiceQueuesConfig as jest.Mock).mockReturnValue({ visitQueueNumberAttributeUuid: 'attr-1' });
    (getVisitQueueNumber as jest.Mock).mockReturnValue('A12');
    (useActiveTicketAssignments as jest.Mock).mockReturnValue({ activeTickets: [], isLoading: false });
    (findAssignedRoomName as jest.Mock).mockReturnValue(undefined);
  });

  it('renders "..." when loading and unassigned', () => {
    (useActiveTicketAssignments as jest.Mock).mockReturnValue({ activeTickets: [], isLoading: true });
    render(<QueueTableRoomColumn queueEntry={mockQueueEntry} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders assigned room name when available', () => {
    (findAssignedRoomName as jest.Mock).mockReturnValue('Desk 1');
    render(<QueueTableRoomColumn queueEntry={mockQueueEntry} />);
    expect(screen.getByText('Desk 1')).toBeInTheDocument();
  });

  it('renders "No Desk" when unassigned', () => {
    render(<QueueTableRoomColumn queueEntry={mockQueueEntry} />);
    expect(screen.getByText('No Desk')).toBeInTheDocument();
  });
});

describe('getColumnHeader for room-assignment', () => {
  it('defaults to "Desk" when no custom header is configured', () => {
    expect(getColumnHeader('room-assignment', {})).toBe('Desk');
  });

  it('uses configured header when provided in queueTables config', () => {
    const config = { queueTables: { columnDefinitions: [{ id: 'room-assignment', header: 'Custom Desk' }] } };
    expect(getColumnHeader('room-assignment', config)).toBe('Custom Desk');
  });
});
