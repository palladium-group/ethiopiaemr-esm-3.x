import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { usePagedBills } from '../billing.resource';
import BillsTable from './bills-table.component';
import userEvent from '@testing-library/user-event';

const mockbills = usePagedBills as jest.Mock;

const mockBillsData = [
  { uuid: '1', patientName: 'John Doe', identifier: '12345678', visitType: 'Checkup', patientUuid: 'uuid1' },
  { uuid: '2', patientName: 'Mary Smith', identifier: '98765432', visitType: 'Wake up', patientUuid: 'uuid2' },
];

jest.mock('../billing.resource', () => ({
  ...jest.requireActual('../billing.resource'),
  usePagedBills: jest.fn(() => ({
    bills: mockBillsData,
    totalCount: mockBillsData.length,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

describe('BillsTable', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  xit('renders data table with pending bills', () => {
    render(<BillsTable />);

    expect(screen.getByText('Visit time')).toBeInTheDocument();
    expect(screen.getByText('Identifier')).toBeInTheDocument();
    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Name/, /Billing service/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeInTheDocument();
    });

    const patientNameLink = screen.getByText('John Doe');
    expect(patientNameLink).toBeInTheDocument();
    expect(patientNameLink.tagName).toBe('A');
  });

  it('displays empty state when there are no bills', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: [],
      totalCount: 0,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByText(/there are no bills to display/i)).toBeInTheDocument();
  });

  it('should not display the table when the data is loading', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: true,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Name/, /Billing service/, /Department/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.queryByRole('columnheader', { name: new RegExp(header, 'i') })).not.toBeInTheDocument();
    });
  });

  it('should display the error state when there is error', () => {
    mockbills.mockImplementationOnce(() => ({
      activeVisits: undefined,
      isLoading: false,
      isValidating: false,
      error: 'Error in fetching data',
    }));

    render(<BillsTable />);

    expect(screen.getByText(/Error State/i)).toBeInTheDocument();
  });

  test('should pass the search term and bill payment status to the server-side query', async () => {
    render(<BillsTable />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'John Doe');

    await waitFor(() =>
      expect(mockbills).toHaveBeenLastCalledWith(expect.objectContaining({ searchTerm: 'John Doe', page: 1 })),
    );

    const billCategorySelect = screen.getByRole('combobox', { name: /filter by/i });
    await user.click(billCategorySelect);
    await user.click(screen.getByText('Pending bills'));

    expect(mockbills).toHaveBeenLastCalledWith(expect.objectContaining({ billStatus: 'PENDING', page: 1 }));
  });

  test('should request the next page from the server when paginating', async () => {
    mockbills.mockImplementation(() => ({
      bills: mockBillsData,
      totalCount: 25,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    await user.click(screen.getByRole('button', { name: /next page/i }));

    expect(mockbills).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 10 }));
  });

  test('should show the visit start time rather than the bill creation time', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: [{ ...mockBillsData[0], dateCreated: 'bill-created', visitStartDatetime: 'visit-started' }],
      totalCount: 1,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByText('visit-started')).toBeInTheDocument();
    expect(screen.queryByText('bill-created')).not.toBeInTheDocument();
  });

  test('should only list the line items added today in the billed items column', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockbills.mockImplementationOnce(() => ({
      bills: [
        {
          ...mockBillsData[0],
          lineItems: [
            { billableService: 'uuid-1:Old Consultation', item: '', dateCreated: yesterday },
            { billableService: 'uuid-2:New Lab Test', item: '', dateCreated: today },
          ],
        },
      ],
      totalCount: 1,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByText('New Lab Test')).toBeInTheDocument();
    expect(screen.queryByText(/Old Consultation/)).not.toBeInTheDocument();
  });

  test('should show the loading spinner while retrieving data', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: true,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    const dataTableSkeleton = screen.getByRole('table');
    expect(dataTableSkeleton).toBeInTheDocument();
    expect(dataTableSkeleton).toHaveClass('cds--skeleton cds--data-table cds--data-table--zebra');
  });

  test('should render patient name as a link', async () => {
    render(<BillsTable />);

    const patientNameLink = screen.getByRole('link', { name: 'John Doe' });
    expect(patientNameLink).toBeInTheDocument();
  });
});
