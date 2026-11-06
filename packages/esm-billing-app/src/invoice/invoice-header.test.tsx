import React from 'react';
import { render, screen } from '@testing-library/react';
import { MappedBill, Payment } from '../types';
import { InvoiceHeader } from './invoice.component';

jest.mock('./invoice-actions.component', () => ({ InvoiceActions: () => null }));
jest.mock('./payment-channel-buttons.component', () => () => null);
jest.mock('../helpers/currency', () => ({ useCurrencyFormatting: () => ({ format: (value: number) => `${value}` }) }));

const payment = { uuid: 'pay-1', voided: false, cashierName: 'Abebe Kebede' } as Payment;

const bill = {
  uuid: 'bill-1',
  receiptNumber: '0015-8',
  dateCreatedUnformatted: '2026-11-01T09:00:00.000Z',
  cashier: { uuid: 'provider-1', display: 'mru role test' },
  payments: [
    payment,
    { ...payment, uuid: 'pay-2', cashierName: 'Abebe Kebede' },
    { ...payment, uuid: 'pay-3', voided: true, cashierName: 'Voided Cashier' },
  ],
} as unknown as MappedBill;

describe('InvoiceHeader', () => {
  it('shows who took the payments as the cashier, not who created the bill', () => {
    render(<InvoiceHeader bill={bill} />);

    const cashier = screen.getByText('Cashier').nextElementSibling;
    expect(cashier).toHaveTextContent(/^Abebe Kebede$/);
  });

  it('shows no cashier before anything is paid', () => {
    render(<InvoiceHeader bill={{ ...bill, payments: [] }} />);

    expect(screen.getByText('Cashier').nextElementSibling).toHaveTextContent('--');
  });
});
