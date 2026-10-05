import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueueEntryBillingRowProvider, useQueueEntryBillingContext } from './queue-entry-billing-context';
import * as billingModule from './useQueueEntryBillingStatus';
import type { QueueEntry } from '../types';

jest.mock('./useQueueEntryBillingStatus', () => ({
  useQueueEntryBillingStatus: jest.fn(),
}));

function ConsumerComponent() {
  const billingStatus = useQueueEntryBillingContext();
  return (
    <div>
      <span data-testid="status">{billingStatus?.status ?? 'NO_CONTEXT'}</span>
      <span data-testid="cleared">{String(billingStatus?.isCleared)}</span>
    </div>
  );
}

describe('QueueEntryBillingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides null when used outside of QueueEntryBillingRowProvider', () => {
    render(<ConsumerComponent />);
    expect(screen.getByTestId('status').textContent).toBe('NO_CONTEXT');
    expect(screen.getByTestId('cleared').textContent).toBe('undefined');
  });

  it('evaluates useQueueEntryBillingStatus and provides the result to child consumers', () => {
    const mockStatus: billingModule.QueueEntryBillingStatus = {
      status: 'CLEARED',
      isCleared: true,
      isLoading: false,
      badgeText: 'Cleared',
      badgeType: 'green',
      message: 'Payment method registered: Cash',
    };

    (billingModule.useQueueEntryBillingStatus as jest.Mock).mockReturnValue(mockStatus);

    const mockQueueEntry = { uuid: 'entry-1' } as QueueEntry;

    render(
      <QueueEntryBillingRowProvider queueEntry={mockQueueEntry}>
        <ConsumerComponent />
      </QueueEntryBillingRowProvider>,
    );

    expect(billingModule.useQueueEntryBillingStatus).toHaveBeenCalledWith(mockQueueEntry);
    expect(screen.getByTestId('status').textContent).toBe('CLEARED');
    expect(screen.getByTestId('cleared').textContent).toBe('true');
  });
});
