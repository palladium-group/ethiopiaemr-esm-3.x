import { renderHook } from '@testing-library/react';
import { useOpenmrsFetchAll } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { useBills, usePagedBills } from './billing.resource';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useOpenmrsFetchAll: jest.fn(),
  formatDate: () => 'formatted-date',
  parseDate: (value: string) => new Date(value),
}));

jest.mock('swr', () => ({ __esModule: true, ...jest.requireActual('swr'), default: jest.fn() }));

const mockUseOpenmrsFetchAll = useOpenmrsFetchAll as jest.Mock;
const mockUseSWR = useSWR as jest.Mock;

const bill = (uuid: string, status: string, dateCreated: string) => ({
  uuid,
  status,
  dateCreated,
  patient: { uuid: 'patient-1', display: 'ID-1 - Test Patient' },
  lineItems: [{ uuid: `${uuid}-li`, paymentStatus: status, price: 10, quantity: 1, billableService: 's:Service' }],
  payments: [{ uuid: `${uuid}-pay`, amountTendered: 10, instanceType: { name: 'Cash' }, attributes: [] }],
});

describe('useBills', () => {
  beforeEach(() => {
    mockUseOpenmrsFetchAll.mockReturnValue({
      data: [
        bill('older', 'PAID', '2026-10-01T08:00:00.000+0300'),
        bill('newer', 'PAID', '2026-10-01T10:00:00.000+0300'),
        bill('pending', 'PENDING', '2026-10-01T09:00:00.000+0300'),
      ],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });
  });

  it('fetches every page, asking for payments and plain local dates', () => {
    renderHook(() => useBills('', 'PAID', new Date(2026, 8, 28, 0, 0), new Date(2026, 9, 1, 23, 59)));

    const url = mockUseOpenmrsFetchAll.mock.calls[0][0] as string;
    expect(url).toContain('lineItems,payments,');
    expect(url).toContain('createdOnOrAfter=2026-09-28&createdOnOrBefore=2026-10-01');
    expect(url).toContain('status=PAID');
  });

  it('returns the bills of the requested status, newest first, with their payments', () => {
    const { result } = renderHook(() => useBills('', 'PAID'));

    expect(result.current.bills.map((mapped) => mapped.uuid)).toEqual(['newer', 'older']);
    expect(result.current.bills[0].payments).toHaveLength(1);
  });

  it('limits the request and the result to the given patient', () => {
    const { result } = renderHook(() => useBills('patient-1'));

    expect(mockUseOpenmrsFetchAll.mock.calls[0][0]).toContain('&patientUuid=patient-1');
    expect(result.current.bills).toHaveLength(3);
  });
});

describe('usePagedBills', () => {
  beforeEach(() => {
    mockUseSWR.mockReturnValue({
      data: { data: { results: [bill('b1', 'PENDING', '2026-10-01T08:00:00.000+0300')], totalCount: 31 } },
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });
  });

  it('asks the server for one page and returns the total count', () => {
    const { result } = renderHook(() => usePagedBills({ page: 3, pageSize: 10 }));

    const url = mockUseSWR.mock.calls[0][0] as string;
    expect(url).toContain('startIndex=20&limit=10');
    expect(url).toContain('includeLineItemActivity=true');
    expect(url).not.toContain('&q=');
    expect(result.current.totalCount).toBe(31);
    expect(result.current.bills).toHaveLength(1);
  });

  it('searches patients and invoice numbers on the server', () => {
    renderHook(() => usePagedBills({ searchTerm: '  0005-9 ' }));

    expect(mockUseSWR.mock.calls[0][0]).toContain('&q=0005-9&searchReceiptNumber=true');
  });
});
