import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showModal } from '@openmrs/esm-framework';
import { LineItem, MappedBill } from '../types';
import PaymentChannelButtons from './payment-channel-buttons.component';

const mockShowModal = showModal as jest.Mock;

const pending = { uuid: 'l1', paymentStatus: 'PENDING' } as LineItem;
const paid = { uuid: 'l2', paymentStatus: 'PAID' } as LineItem;
const bill = { uuid: 'bill-1', balance: 40, lineItems: [pending, paid] } as MappedBill;

describe('PaymentChannelButtons', () => {
  it('opens the Telebirr and EthSwitch dialogs for the ticked line items', async () => {
    const user = userEvent.setup();
    render(<PaymentChannelButtons bill={bill} selectedLineItems={[pending]} />);

    await user.click(screen.getByRole('button', { name: /telebirr payment/i }));
    expect(mockShowModal).toHaveBeenLastCalledWith(
      'initiate-payment-modal',
      expect.objectContaining({ bill, selectedLineItems: [pending] }),
    );

    await user.click(screen.getByRole('button', { name: /ethswitch payment/i }));
    expect(mockShowModal).toHaveBeenLastCalledWith(
      'ethswitch-payment-modal',
      expect.objectContaining({ bill, selectedLineItems: [pending] }),
    );
  });

  it('is disabled when no pending line item is ticked', () => {
    render(<PaymentChannelButtons bill={bill} selectedLineItems={[]} />);

    expect(screen.getByRole('button', { name: /telebirr payment/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ethswitch payment/i })).toBeDisabled();
  });

  it('is hidden when the bill has nothing left to pay', () => {
    const { container } = render(
      <PaymentChannelButtons bill={{ ...bill, lineItems: [paid] } as MappedBill} selectedLineItems={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
