import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MappedBill } from '../../types';
import { makePayment } from '../payments/payments.resource';
import InvoiceCheckout from './invoice-checkout.component';

const mockMakePayment = makePayment as jest.Mock;

jest.mock('../../helpers/currency', () => ({
  useCurrencyFormatting: () => ({ format: (amount: number) => `ETB ${Number(amount).toFixed(2)}` }),
}));
jest.mock('../payments/payment-history/payment-history.component', () => () => null);
jest.mock('../payments/payments.resource', () => ({ makePayment: jest.fn() }));
jest.mock('swr', () => ({ ...jest.requireActual('swr'), mutate: jest.fn() }));

const mockPaymentModes = [
  { uuid: 'cash', name: 'Cash', attributeTypes: [] },
  {
    uuid: 'cbhi',
    name: 'CBHI',
    attributeTypes: [{ uuid: 'ref-attr', description: 'Reference Number', required: true }],
  },
];
jest.mock('../../billing.resource', () => ({
  usePaymentModes: () => ({ paymentModes: mockPaymentModes, isLoading: false }),
}));
jest.mock('../../hooks/useBillableServices', () => () => ({
  isLoading: false,
  billableServices: [
    { uuid: 's1', servicePrices: [{ paymentMode: { uuid: 'cash', name: 'Cash' }, price: 40 }] },
    { uuid: 's2', servicePrices: [{ paymentMode: { uuid: 'cbhi', name: 'CBHI' }, price: 100 }] },
    { uuid: 's3', servicePrices: [{ paymentMode: { uuid: 'cash', name: 'Cash' }, price: 30 }] },
  ],
}));
jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: () => ({ visitAttributeTypes: { paymentMethods: 'payment-method-attr' } }),
  useVisit: () => ({
    activeVisit: { attributes: [{ attributeType: { uuid: 'payment-method-attr' }, value: 'cash' }] },
  }),
  showSnackbar: jest.fn(),
  UserHasAccess: ({ children }) => children,
}));

const makeBill = () =>
  ({
    uuid: 'bill-1',
    patientUuid: 'patient-1',
    balance: 170,
    totalAmount: 220,
    tenderedAmount: 0,
    payments: [],
    lineItems: [
      { uuid: 'l1', billableService: 's1:Consultation', price: 40, quantity: 1, paymentStatus: 'PENDING' },
      { uuid: 'l2', billableService: 's2:Scan', price: 100, quantity: 1, paymentStatus: 'PENDING' },
      { uuid: 'l3', billableService: 's3:Iron Supplement', price: 30, quantity: 1, paymentStatus: 'PENDING' },
      { uuid: 'l4', billableService: 's1:Antepartum', price: 50, quantity: 1, paymentStatus: 'EXEMPTED' },
    ],
  } as unknown as MappedBill);

let renderCount = 0;
let reportedSelection: Array<string> = [];

/** Mimics the invoice page: the bill object is rebuilt on every render and the selection is reported up. */
function Page() {
  renderCount++;
  const [selected, setSelected] = useState([]);
  reportedSelection = selected.map((lineItem) => lineItem.uuid);
  return <InvoiceCheckout bill={makeBill()} onSelectItem={setSelected} />;
}

const amountInputs = () => screen.getAllByRole('spinbutton') as Array<HTMLInputElement>;
const processButton = () => screen.getByRole('button', { name: /process payment/i });

describe('InvoiceCheckout', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    renderCount = 0;
    mockMakePayment.mockResolvedValue({ ok: true, data: { uuid: 'payment-1' } });
  });

  it('defaults the payment options from the visit method and the configured prices', () => {
    render(<Page />);

    expect(renderCount).toBeLessThan(10);
    expect(amountInputs().map((input) => input.value)).toEqual(['70', '100']);
    expect(screen.getByText('ETB 170.00 / ETB 170.00')).toBeInTheDocument();
    expect(reportedSelection).toEqual(['l1', 'l2', 'l3']);
  });

  it('cannot tick paid or exempted line items', () => {
    render(<Page />);

    expect(screen.getByRole('checkbox', { name: 'Antepartum' })).toBeDisabled();
    expect(screen.getByText('EXEMPTED')).toBeInTheDocument();
  });

  it('requires the reference number of methods that need one', async () => {
    render(<Page />);

    expect(processButton()).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Enter ref. number'), 'CBHI-77');
    expect(processButton()).toBeEnabled();
  });

  it('keeps the amounts in step with the ticked items, and keeps a typed reference number', async () => {
    render(<Page />);
    await user.type(screen.getByPlaceholderText('Enter ref. number'), 'CBHI-77');

    await user.click(screen.getByRole('checkbox', { name: 'Iron Supplement' }));

    expect(amountInputs().map((input) => input.value)).toEqual(['40', '100']);
    expect(screen.getByText('ETB 140.00 / ETB 140.00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter ref. number')).toHaveValue('CBHI-77');
    expect(screen.queryByText(/over payment/i)).not.toBeInTheDocument();
    expect(reportedSelection).toEqual(['l1', 'l2']);
  });

  it('warns and blocks payment when an edited amount does not match the selected items', async () => {
    render(<Page />);
    await user.type(screen.getByPlaceholderText('Enter ref. number'), 'CBHI-77');

    await user.clear(amountInputs()[0]);
    await user.type(amountInputs()[0], '50');

    expect(screen.getByText(/incomplete payment/i)).toBeInTheDocument();
    expect(processButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^reset$/i }));

    expect(amountInputs().map((input) => input.value)).toEqual(['70', '100']);
    expect(screen.queryByText(/incomplete payment/i)).not.toBeInTheDocument();
  });

  it('lets payment options be removed and added', async () => {
    render(<Page />);

    await user.click(screen.getAllByRole('button', { name: /remove payment option/i })[1]);
    expect(amountInputs()).toHaveLength(1);
    expect(screen.getByText(/incomplete payment/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add payment option/i }));
    expect(amountInputs()).toHaveLength(2);
  });

  it('records one payment per option against the ticked line items after confirmation', async () => {
    render(<Page />);
    await user.type(screen.getByPlaceholderText('Enter ref. number'), 'CBHI-77');

    await user.click(processButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(mockMakePayment).toHaveBeenCalledTimes(2));
    expect(mockMakePayment).toHaveBeenNthCalledWith(
      1,
      'bill-1',
      expect.objectContaining({ instanceType: 'cash', amountTendered: 70, attributes: [] }),
    );
    expect(mockMakePayment).toHaveBeenNthCalledWith(
      2,
      'bill-1',
      expect.objectContaining({
        instanceType: 'cbhi',
        amountTendered: 100,
        attributes: [{ attributeType: 'ref-attr', value: 'CBHI-77' }],
      }),
    );
  });
});
