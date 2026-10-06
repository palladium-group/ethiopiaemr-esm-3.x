import React from 'react';
import { render, screen } from '@testing-library/react';
import BillTimeline from './bill-timeline.component';
import { useBillTimeline } from './bill-timeline.resource';
import { MappedBill } from '../../types';

const mockUseBillTimeline = useBillTimeline as jest.Mock;

jest.mock('./bill-timeline.resource', () => ({
  ...jest.requireActual('./bill-timeline.resource'),
  useBillTimeline: jest.fn(),
}));

jest.mock('../../helpers/currency', () => ({
  useCurrencyFormatting: () => ({ format: (amount: number) => `ETB ${Number(amount).toFixed(2)}` }),
}));

const bill = { uuid: 'bill-1' } as MappedBill;

describe('BillTimeline', () => {
  it('shows each event with its amount, status and who did it', () => {
    mockUseBillTimeline.mockReturnValue({
      isLoading: false,
      error: null,
      events: [
        { id: 'opened', kind: 'opened', date: new Date('2026-10-01T09:00:00Z'), actor: 'Cashier One' },
        {
          id: 'item',
          kind: 'itemAdded',
          date: new Date('2026-10-01T09:05:00Z'),
          name: 'Consultation',
          amount: 40,
          quantity: 1,
          price: 40,
          status: 'PAID',
          actor: 'Dr Who',
        },
        { id: 'payment', kind: 'payment', date: new Date('2026-10-01T09:10:00Z'), amount: 40, detail: 'Cash' },
        { id: 'closed', kind: 'closed', date: new Date('2026-10-01T09:20:00Z'), detail: 'Visit checked out' },
      ],
    });

    render(<BillTimeline bill={bill} />);

    expect(screen.getByText('Bill opened')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('by Dr Who')).toBeInTheDocument();
    expect(screen.getByText('Payment received')).toBeInTheDocument();
    expect(screen.getByText('· Cash')).toBeInTheDocument();
    expect(screen.getAllByText('ETB 40.00')).toHaveLength(2);
    expect(screen.getByText('Bill closed')).toBeInTheDocument();
    expect(screen.getByText(/Visit checked out/)).toBeInTheDocument();
  });

  it('shows a message when nothing has happened yet', () => {
    mockUseBillTimeline.mockReturnValue({ isLoading: false, error: null, events: [] });

    render(<BillTimeline bill={bill} />);

    expect(screen.getByText(/nothing has happened on this bill yet/i)).toBeInTheDocument();
  });

  it('shows a message when the timeline cannot be loaded', () => {
    mockUseBillTimeline.mockReturnValue({ isLoading: false, error: new Error('boom'), events: [] });

    render(<BillTimeline bill={bill} />);

    expect(screen.getByText(/could not load the timeline/i)).toBeInTheDocument();
  });
});
