import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricsCards from './metrics-cards.component';
import { useBillSummary } from './metrics.resource';

const mockUseBillSummary = useBillSummary as jest.Mock;

jest.mock('./metrics.resource', () => ({
  useBillSummary: jest.fn(),
}));

jest.mock('../helpers', () => ({
  convertToCurrency: jest.fn((amount: number) => (amount != null ? `KES ${Number(amount).toFixed(2)}` : 'KES 0.00')),
}));

const mockBillSummary = {
  totalBills: 1000,
  paidBills: 600,
  pendingBills: 300,
  exemptedBills: 100,
};

describe('MetricsCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when data is loading', () => {
    mockUseBillSummary.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<MetricsCards />);
    expect(screen.getByText(/Loading bill metrics.../i)).toBeInTheDocument();
  });

  it('renders error state when request fails', () => {
    mockUseBillSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Internal server error'),
    });
    render(<MetricsCards />);
    expect(
      screen.getByText(
        /Sorry, there was a problem displaying this information. You can try to reload this page, or contact the site administrator and quote the error code above./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders metrics cards with bill summary data', () => {
    mockUseBillSummary.mockReturnValue({
      data: mockBillSummary,
      isLoading: false,
      error: null,
    });
    render(<MetricsCards />);
    expect(screen.getByText('Total Bills')).toBeInTheDocument();
    expect(screen.getByText('Paid Bills')).toBeInTheDocument();
    expect(screen.getByText('Pending Bills')).toBeInTheDocument();
    expect(screen.getByText('Exempted Bills')).toBeInTheDocument();
    expect(screen.getByText('KES 1000.00')).toBeInTheDocument();
    expect(screen.getByText('KES 600.00')).toBeInTheDocument();
    expect(screen.getByText('KES 300.00')).toBeInTheDocument();
    expect(screen.getByText('KES 100.00')).toBeInTheDocument();
  });
});
