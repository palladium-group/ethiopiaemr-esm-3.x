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
    mockbills.mockImplementation(() => ({
      bills: mockBillsData,
      totalCount: mockBillsData.length,
      isLoading: false,
      isValidating: false,
      error: null,
    }));
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

  test('should summarise the items added today and list them when the bill row is expanded', async () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockbills.mockImplementation(() => ({
      bills: [
        {
          ...mockBillsData[0],
          lineItems: [
            {
              uuid: 'li-old',
              billableService: 'uuid-1:Old Consultation',
              price: 50,
              quantity: 1,
              paymentStatus: 'PAID',
              auditInfo: { dateCreated: yesterday },
            },
            {
              uuid: 'li-lab',
              billableService: 'uuid-2:New Lab Test',
              price: 40,
              quantity: 2,
              paymentStatus: 'PENDING',
              auditInfo: { dateCreated: today },
            },
            {
              uuid: 'li-drug',
              item: 'uuid-3:Iron Supplement',
              price: 30,
              quantity: 1,
              paymentStatus: 'PAID',
              auditInfo: { dateCreated: today },
            },
          ],
        },
      ],
      totalCount: 1,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.queryByText('New Lab Test')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show line items/i }));

    expect(screen.getByText('New Lab Test')).toBeInTheDocument();
    expect(screen.getByText('Iron Supplement')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText(/Old Consultation/)).not.toBeInTheDocument();
  });

  test('should not crash when a line item has no service or item name', async () => {
    mockbills.mockImplementation(() => ({
      bills: [
        {
          ...mockBillsData[0],
          lineItems: [{ uuid: 'li-1' }, { uuid: 'li-2', billableService: 'uuid-2:New Lab Test' }],
        },
      ],
      totalCount: 1,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);
    await user.click(screen.getByRole('button', { name: /show line items/i }));

    expect(screen.getByText('New Lab Test')).toBeInTheDocument();
  });

  test('should say so when a bill has no items added today', async () => {
    mockbills.mockImplementation(() => ({
      bills: [{ ...mockBillsData[0], lineItems: [] }],
      totalCount: 1,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByText('0 items')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show line items/i }));
    expect(screen.getByText(/no items were added to this bill today/i)).toBeInTheDocument();
  });

  test('should keep only one bill expanded at a time and offer no expand-all control', async () => {
    const lineItem = (uuid: string, name: string) => ({
      uuid,
      billableService: `service:${name}`,
      price: 10,
      quantity: 1,
      paymentStatus: 'PENDING',
      auditInfo: { dateCreated: new Date().toISOString() },
    });
    mockbills.mockImplementation(() => ({
      bills: [
        { ...mockBillsData[0], lineItems: [lineItem('li-1', 'Consultation')] },
        { ...mockBillsData[1], lineItems: [lineItem('li-2', 'Skin Ointment')] },
      ],
      totalCount: 2,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getAllByRole('button', { name: /show line items/i })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /expand all|collapse all/i })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /show line items/i })[0]);
    expect(screen.getByText('Consultation')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show line items/i }));
    expect(screen.getByText('Skin Ointment')).toBeInTheDocument();
    expect(screen.queryByText('Consultation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide line items/i }));
    expect(screen.queryByText('Skin Ointment')).not.toBeInTheDocument();
  });

  test('should show the spinner while a requested page is loading, but not for background refreshes', () => {
    mockbills.mockImplementation(() => ({
      bills: mockBillsData,
      totalCount: mockBillsData.length,
      isLoading: false,
      isValidating: true,
      error: null,
    }));
    const { container, unmount } = render(<BillsTable />);
    expect(container.querySelector('.cds--inline-loading')).not.toBeInTheDocument();
    unmount();

    mockbills.mockImplementation(() => ({
      bills: mockBillsData,
      totalCount: mockBillsData.length,
      isLoading: true,
      isValidating: true,
      error: null,
    }));
    const { container: loadingContainer } = render(<BillsTable />);
    expect(loadingContainer.querySelector('.cds--inline-loading')).toBeInTheDocument();
  });

  test('should show the priority of each bill and of each line item', async () => {
    const today = new Date().toISOString();
    const lineItem = (uuid: string, name: string, orderUrgency?: string) => ({
      uuid,
      billableService: `service:${name}`,
      price: 10,
      quantity: 1,
      paymentStatus: 'PENDING',
      orderUrgency,
      auditInfo: { dateCreated: today },
    });
    mockbills.mockImplementation(() => ({
      bills: [
        {
          ...mockBillsData[0],
          lineItems: [
            lineItem('li-1', 'Blood Test', 'STAT'),
            lineItem('li-2', 'X-Ray', 'ROUTINE'),
            lineItem('li-3', 'Card Fee'),
          ],
        },
        { ...mockBillsData[1], lineItems: [lineItem('li-4', 'Consultation', 'ROUTINE')] },
      ],
      totalCount: 2,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    // A bill whose items differ shows how many distinct priorities it has; a uniform one shows the priority.
    expect(screen.getByRole('columnheader', { name: /priority/i })).toBeInTheDocument();
    expect(screen.getByText('2 priorities')).toBeInTheDocument();
    expect(screen.getAllByText('Routine')).toHaveLength(1);

    await user.click(screen.getAllByRole('button', { name: /show line items/i })[0]);

    expect(screen.getByText('Stat')).toBeInTheDocument();
    expect(screen.getAllByText('Routine')).toHaveLength(2);
  });

  test('should show no priority for a bill whose items did not come from orders', () => {
    mockbills.mockImplementation(() => ({
      bills: [{ ...mockBillsData[0], lineItems: [{ uuid: 'li-1', billableService: 'service:Card Fee' }] }],
      totalCount: 1,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.queryByText(/priorities/)).not.toBeInTheDocument();
    expect(screen.queryByText('Routine')).not.toBeInTheDocument();
  });

  test('should show the invoice number of each bill', () => {
    mockbills.mockImplementation(() => ({
      bills: [{ ...mockBillsData[0], receiptNumber: '0005-9' }, mockBillsData[1]],
      totalCount: 2,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByRole('columnheader', { name: /invoice number/i })).toBeInTheDocument();
    expect(screen.getByText('0005-9')).toBeInTheDocument();
  });

  test('should mark closed bills in the status column', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: [
        { ...mockBillsData[0], status: 'PAID', closed: true },
        { ...mockBillsData[1], status: 'PENDING', closed: false },
      ],
      totalCount: 2,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getAllByText('Closed')).toHaveLength(1);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
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
