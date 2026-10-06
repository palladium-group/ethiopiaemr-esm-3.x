import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient } from '@openmrs/esm-framework';
import { PatientBills } from './patient-bills.component';
import { mockPatient } from '../../../../__mocks__/patient.mock';
import { MappedBill } from '../types';

// Mock dependencies
jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  usePatient: jest.fn(),
  getPatientName: jest.fn((patient) => {
    return `${patient?.name?.[0]?.given?.[0]} ${patient?.name?.[0]?.family}`;
  }),
  ConfigurableLink: jest.fn(({ children, to, templateParams }) => (
    <a href={to.replace('${patientUuid}', templateParams.patientUuid).replace('${uuid}', templateParams.uuid)}>
      {children}
    </a>
  )),
}));

jest.mock('../helpers/currency', () => ({
  useCurrencyFormatting: () => ({ format: (amount: number) => `ETB ${Number(amount).toFixed(2)}` }),
}));

jest.mock('./patient-bills-dashboard/empty-patient-bill.component', () => {
  return jest.fn(({ title, subTitle }) => (
    <div>
      <p>{title}</p>
      <p>{subTitle}</p>
    </div>
  ));
});

const mockUsePatient = usePatient as jest.MockedFunction<typeof usePatient>;

const mockBills: Array<MappedBill> = [
  {
    uuid: '65f9f19a-f70e-44f4-9c6c-55b23dab4a3f',
    id: 30,
    patientUuid: '8673ee4f-e2ab-4077-ba55-4980f408773e',
    patientName: 'John Wilson',
    cashPointUuid: '381595a0-2229-4152-9c45-bd3692aac7cc',
    cashPointName: 'Pharmacy Cashier',
    cashPointLocation: 'Amani Family Medical Clinic',
    cashier: {
      uuid: '48b55692-e061-4ffa-b1f2-fd4aaf506224',
      display: 'admin - ayunda ayunda ayunda',
      links: [],
    },
    receiptNumber: 'CP2-0011-0',
    status: 'PENDING' as any,
    identifier: '100GEJ',
    dateCreated: '2023-11-29T09:35:20.000+0300',
    dateCreatedUnformatted: '2023-11-29T09:35:20.000+0300',
    lineItems: [
      {
        uuid: '6ff72ef2-4265-4fdb-8563-a3a2eefa484e',
        display: 'BillLineItem',
        billableService: 'uuid:HIV self-test kit',
        voided: false,
        voidReason: null,
        item: 'HIV self-test kit',
        quantity: 1,
        price: 500.0,
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '1.8',
        paymentStatus: 'PENDING',
        itemOrServiceConceptUuid: '',
        serviceTypeUuid: '',
        order: null,
      },
    ],
    billingService: 'uuid:HIV self-test kit',
    payments: [],
    totalAmount: 500,
    tenderedAmount: 0,
  },
  {
    uuid: '75f9f19a-f70e-44f4-9c6c-55b23dab4a3f',
    id: 31,
    patientUuid: '8673ee4f-e2ab-4077-ba55-4980f408773e',
    patientName: 'John Wilson',
    cashPointUuid: '381595a0-2229-4152-9c45-bd3692aac7cc',
    cashPointName: 'Pharmacy Cashier',
    cashPointLocation: 'Amani Family Medical Clinic',
    cashier: {
      uuid: '48b55692-e061-4ffa-b1f2-fd4aaf506224',
      display: 'admin - ayunda ayunda ayunda',
      links: [],
    },
    receiptNumber: 'CP2-0012-0',
    status: 'PAID' as any,
    identifier: '100GEJ',
    dateCreated: '2023-11-30T10:15:20.000+0300',
    dateCreatedUnformatted: '2023-11-30T10:15:20.000+0300',
    lineItems: [
      {
        uuid: '7ff72ef2-4265-4fdb-8563-a3a2eefa484e',
        display: 'BillLineItem',
        billableService: 'uuid2:Medical Certificate',
        voided: false,
        voidReason: null,
        item: 'Medical Certificate',
        quantity: 1,
        price: 1000.0,
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '1.8',
        paymentStatus: 'PAID',
        itemOrServiceConceptUuid: '',
        serviceTypeUuid: '',
        order: null,
      },
    ],
    billingService: 'uuid2:Medical Certificate',
    payments: [],
    totalAmount: 1000,
    tenderedAmount: 1000,
  },
];

describe('PatientBills', () => {
  const mockOnCancel = jest.fn();
  const patientUuid = '8673ee4f-e2ab-4077-ba55-4980f408773e';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatient.mockReturnValue({
      patient: mockPatient as any,
      isLoading: false,
      error: null,
      patientUuid: patientUuid,
    });
  });

  it('should render loading state when patient data is loading', () => {
    mockUsePatient.mockReturnValue({
      patient: null,
      isLoading: true,
      error: null,
      patientUuid: patientUuid,
    });

    render(<PatientBills bills={mockBills} onCancel={mockOnCancel} patientUuid={patientUuid} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render loading state while the bills are loading', () => {
    render(<PatientBills bills={[]} isLoading onCancel={mockOnCancel} patientUuid={patientUuid} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('No bills found')).not.toBeInTheDocument();
  });

  it('should not show a patient other than the selected one', () => {
    // usePatient can keep returning the previously selected patient.
    render(<PatientBills bills={mockBills} onCancel={mockOnCancel} patientUuid="another-patient-uuid" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText(/100GEJ|CP2-0011-0/)).not.toBeInTheDocument();
  });

  it('should render empty state when there are no bills', () => {
    render(<PatientBills bills={[]} onCancel={mockOnCancel} patientUuid={patientUuid} />);

    expect(screen.getByText('No bills found')).toBeInTheDocument();
    expect(screen.getByText('No bills found for this patient')).toBeInTheDocument();
  });

  it('should render the bills table with the same columns as the bills list', () => {
    render(<PatientBills bills={mockBills} onCancel={mockOnCancel} patientUuid={patientUuid} />);

    ['Date', 'Invoice Number', 'Priority', 'Billed Items', 'Total', 'Status'].forEach((header) => {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    });
    expect(screen.getByText('Patient bill summary')).toBeInTheDocument();
  });

  it('should show each bill with its invoice number, item count, total and status', () => {
    render(<PatientBills bills={mockBills} onCancel={mockOnCancel} patientUuid={patientUuid} />);

    expect(screen.getByRole('link', { name: 'CP2-0011-0' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CP2-0012-0' })).toBeInTheDocument();
    expect(screen.getAllByText('1 item')).toHaveLength(2);
    expect(screen.getByText('ETB 500.00')).toBeInTheDocument();
    expect(screen.getByText('ETB 1000.00')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });

  it('should mark closed bills', () => {
    render(
      <PatientBills bills={[{ ...mockBills[1], closed: true }]} onCancel={mockOnCancel} patientUuid={patientUuid} />,
    );

    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('should list the line items of one bill at a time when its row is expanded', async () => {
    const user = userEvent.setup();
    render(<PatientBills bills={mockBills} onCancel={mockOnCancel} patientUuid={patientUuid} />);

    expect(screen.queryByText('HIV self-test kit')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /show line items/i })[0]);
    expect(screen.getByText('HIV self-test kit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show line items/i }));
    expect(screen.getByText('Medical Certificate')).toBeInTheDocument();
    expect(screen.queryByText('HIV self-test kit')).not.toBeInTheDocument();
  });

  it('should clear the selected patient with the clear search button', async () => {
    const user = userEvent.setup();
    render(<PatientBills bills={mockBills} onCancel={mockOnCancel} patientUuid={patientUuid} />);

    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(mockOnCancel).toHaveBeenCalledWith(undefined);
  });
});
