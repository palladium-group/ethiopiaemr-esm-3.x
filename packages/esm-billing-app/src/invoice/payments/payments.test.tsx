import { showSnackbar } from '@openmrs/esm-framework';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mockBill, mockLineItems, mockPaymentModes } from '../../../__mocks__/bills.mock';
import { usePaymentModes } from '../../billing.resource';
import Payments from './payments.component';
import { makePayment } from './payments.resource';
import { LineItem, PaymentMethod } from '../../types';

const mockMakePayment = makePayment as jest.MockedFunction<typeof makePayment>;
const mockUsePaymentModes = usePaymentModes as jest.MockedFunction<typeof usePaymentModes>;
const mockShowSnackbar = showSnackbar as jest.MockedFunction<typeof showSnackbar>;

jest.mock('./payments.resource', () => ({
  makePayment: jest.fn(),
}));

jest.mock('../../billing.resource', () => ({
  usePaymentModes: jest.fn(),
}));

jest.mock('../../hooks/useBillableServices', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    billableServices: [],
    isLoading: false,
    error: null,
  })),
}));

const updatedMockPaymentModes: PaymentMethod[] = mockPaymentModes.map((mode) => {
  const baseMode = {
    ...mode,
    retireReason: null,
    auditInfo: {
      dateCreated: '2024-01-01',
      creator: {
        uuid: 'user-1',
        display: 'Test User',
        links: [{ rel: 'self', uri: '/ws/rest/v1/user/user-1', resourceAlias: 'user' }],
      },
      dateChanged: null,
      changedBy: null,
    },
    sortOrder: null,
    resourceVersion: '1.8',
  };

  if (mode.name === 'Mobile Money') {
    return {
      ...baseMode,
      attributeTypes: [
        {
          uuid: 'd453e528-0264-4d6e-ae23-bc0b777e1146',
          name: 'Reference Number',
          description: 'Reference Number',
          retired: false,
          attributeOrder: 0,
          format: 'java.lang.String',
          foreignKey: null,
          regExp: null,
          required: true,
        },
      ],
    };
  }

  return {
    ...baseMode,
    attributeTypes: mode.attributeTypes || [],
  };
});

const updatedMockLineItems: LineItem[] = mockLineItems.map((item) => ({
  ...item,
  itemOrServiceConceptUuid: 'concept-uuid-1',
  serviceTypeUuid: 'servicetype-uuid-1',
  order: {
    uuid: 'order-uuid-1',
    display: item.billableService.split(':')[1],
    links: [],
    type: 'testorder',
  },
}));

// Selected total must match entered tender (100) and bill.totalAmount for schema validation
const selectedLineItemsForPayment: LineItem[] = [
  updatedMockLineItems.find((item) => item.price === 100) ?? updatedMockLineItems[1],
];

const payableLineItemUuids = selectedLineItemsForPayment
  .filter((item) => item.paymentStatus !== 'PAID' && item.paymentStatus !== 'EXEMPTED')
  .map((item) => item.uuid);

describe('Payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display error when posting payment fails', async () => {
    const user = userEvent.setup();
    const mockFieldErrorResponse = {
      responseBody: {
        error: {
          message: 'Invalid Submission',
          code: 'webservices.rest.error.invalid.submission',
          globalErrors: [],
          fieldErrors: {},
        },
      },
    };
    mockMakePayment.mockRejectedValueOnce(mockFieldErrorResponse);
    mockUsePaymentModes.mockReturnValue({
      paymentModes: updatedMockPaymentModes,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(<Payments bill={mockBill as any} selectedLineItems={selectedLineItemsForPayment} />);
    const addPaymentMethod = screen.getByRole('button', { name: /Add payment option/i });
    await user.click(addPaymentMethod);
    await user.click(screen.getByRole('combobox', { name: /Payment method/i }));
    const mobileMoneyOption = screen.getByRole('option', { name: /Mobile Money/i });
    await user.click(mobileMoneyOption);

    const amountInput = screen.getByRole('spinbutton', { name: /Amount/i });
    await user.type(amountInput, '100');

    const referenceInput = screen.getByRole('textbox', { name: /Reference Number/i });
    await user.type(referenceInput, 'MPESA123456');

    const submitButton = screen.getByRole('button', { name: /Process Payment/i });
    expect(submitButton).toBeEnabled();
    await user.click(submitButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await user.click(confirmButton);

    expect(mockMakePayment).toHaveBeenCalledTimes(1);
    expect(mockMakePayment).toHaveBeenCalledWith('6eb8d678-514d-46ad-9554-51e48d96d567', {
      instanceType: '28989582-e8c3-46b0-96d0-c249cb06d5c6',
      amount: 100,
      amountTendered: 100,
      attributes: [
        {
          attributeType: 'd453e528-0264-4d6e-ae23-bc0b777e1146',
          value: 'MPESA123456',
        },
      ],
      lineItemsToMarkPaid: payableLineItemUuids,
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith({
      title: 'Bill payment failed',
      subtitle:
        'An unexpected error occurred while processing your bill payment. Please contact the system administrator and provide them with the following error details: Invalid Submission',
      kind: 'error',
      timeoutInMs: 3000,
      isLowContrast: true,
    });
  });

  test('should process payment with correct payload for payment method without attributes', async () => {
    const user = userEvent.setup();
    mockMakePayment.mockResolvedValueOnce({
      ok: true,
      data: { uuid: 'payment-uuid-1' },
    } as any);
    mockUsePaymentModes.mockReturnValue({
      paymentModes: updatedMockPaymentModes,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(<Payments bill={mockBill as any} selectedLineItems={selectedLineItemsForPayment} />);
    const addPaymentMethod = screen.getByRole('button', { name: /Add payment option/i });
    await user.click(addPaymentMethod);
    await user.click(screen.getByRole('combobox', { name: /Payment method/i }));
    const cashOption = screen.getByRole('option', { name: /Cash/i });
    await user.click(cashOption);

    const amountInput = screen.getByRole('spinbutton', { name: /Amount/i });
    await user.type(amountInput, '100');

    const submitButton = screen.getByRole('button', { name: /Process Payment/i });
    expect(submitButton).toBeEnabled();
    await user.click(submitButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await user.click(confirmButton);

    expect(mockMakePayment).toHaveBeenCalledTimes(1);
    expect(mockMakePayment).toHaveBeenCalledWith('6eb8d678-514d-46ad-9554-51e48d96d567', {
      instanceType: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
      amount: 100,
      amountTendered: 100,
      attributes: [],
      lineItemsToMarkPaid: payableLineItemUuids,
    });
  });

  test('should automatically focus on the payment method field when user clicks add payment options', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: updatedMockPaymentModes,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });
    render(<Payments bill={mockBill as any} selectedLineItems={selectedLineItemsForPayment} />);
    const addPaymentMethod = screen.getByRole('button', { name: /Add payment option/i });
    await user.click(addPaymentMethod);

    expect(screen.getByRole('combobox', { name: /Payment method/i })).toHaveFocus();
    await user.click(screen.getByRole('combobox', { name: /Payment method/i }));
    const cashOption = screen.getByRole('option', { name: /Cash/i });
    await user.click(cashOption);
    expect(screen.getByRole('spinbutton', { name: /Amount/i })).toHaveFocus();
    const amountInput = screen.getByRole('spinbutton', { name: /Amount/i });
    await user.type(amountInput, '100');
  });

  test('should disable process payment when tendered amount does not equal selected line items total', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: updatedMockPaymentModes,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(<Payments bill={mockBill as any} selectedLineItems={selectedLineItemsForPayment} />);
    const addPaymentMethod = screen.getByRole('button', { name: /Add payment option/i });
    await user.click(addPaymentMethod);
    await user.click(screen.getByRole('combobox', { name: /Payment method/i }));
    await user.click(screen.getByRole('option', { name: /Cash/i }));

    const amountInput = screen.getByRole('spinbutton', { name: /Amount/i });
    await user.type(amountInput, '50');

    expect(screen.getByRole('button', { name: /Process Payment/i })).toBeDisabled();
    expect(screen.getByText(/Incomplete payment/i)).toBeInTheDocument();
  });
});
