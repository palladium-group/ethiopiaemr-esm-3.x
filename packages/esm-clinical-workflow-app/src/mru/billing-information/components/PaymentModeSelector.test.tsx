import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentModeSelector } from './PaymentModeSelector';
import { PAYMENT_MODE_UUIDS } from '../billing-constants';

const mockBillingTypes = [
  { uuid: PAYMENT_MODE_UUIDS.CASH, name: 'Cash' },
  { uuid: PAYMENT_MODE_UUIDS.CBHI, name: 'CBHI' },
  { uuid: PAYMENT_MODE_UUIDS.SHI, name: 'SHI' },
  { uuid: PAYMENT_MODE_UUIDS.INSURANCE, name: 'Insurance' },
  { uuid: PAYMENT_MODE_UUIDS.CREDIT_COMPANY, name: 'Credit Company' },
  { uuid: PAYMENT_MODE_UUIDS.FREE_24_HOURS, name: '24 Hours Free' },
];

const mockT = ((key: string, defaultVal: string) => defaultVal || key) as any;

describe('PaymentModeSelector', () => {
  it('renders direct payment methods and groups credit methods under Credit', () => {
    const onSelect = jest.fn();
    render(
      <PaymentModeSelector
        billingTypes={mockBillingTypes}
        selectedBillingTypeUuid={PAYMENT_MODE_UUIDS.CASH}
        onSelectBillingType={onSelect}
        t={mockT}
      />,
    );

    // Direct methods rendered
    expect(screen.getByRole('radio', { name: /Cash/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /24 Hours Free/i })).toBeInTheDocument();

    // Credit section header
    expect(screen.getByText('Credit')).toBeInTheDocument();

    // Credit methods rendered inside
    expect(screen.getByRole('radio', { name: /CBHI/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /SHI/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Insurance/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Credit Company/i })).toBeInTheDocument();
  });

  it('calls onSelectBillingType when a payment mode is clicked', () => {
    const onSelect = jest.fn();
    render(
      <PaymentModeSelector
        billingTypes={mockBillingTypes}
        selectedBillingTypeUuid={PAYMENT_MODE_UUIDS.CASH}
        onSelectBillingType={onSelect}
        t={mockT}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /CBHI/i }));
    expect(onSelect).toHaveBeenCalledWith(PAYMENT_MODE_UUIDS.CBHI);

    fireEvent.click(screen.getByRole('radio', { name: /24 Hours Free/i }));
    expect(onSelect).toHaveBeenCalledWith(PAYMENT_MODE_UUIDS.FREE_24_HOURS);
  });

  it('shows selected tag when a credit payment mode is active', () => {
    const onSelect = jest.fn();
    render(
      <PaymentModeSelector
        billingTypes={mockBillingTypes}
        selectedBillingTypeUuid={PAYMENT_MODE_UUIDS.INSURANCE}
        onSelectBillingType={onSelect}
        t={mockT}
      />,
    );

    const insuranceRadio = screen.getByRole('radio', { name: /Insurance/i });
    expect(insuranceRadio).toHaveAttribute('aria-checked', 'true');

    const cashRadio = screen.getByRole('radio', { name: /Cash/i });
    expect(cashRadio).toHaveAttribute('aria-checked', 'false');

    // Shows active tag for selected credit mode
    expect(screen.getAllByText('Insurance').length).toBeGreaterThanOrEqual(1);
  });
});
