import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type OrderBasketExtensionProps, type DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';
import { getByTextWithMarkup } from 'tools';
import { mockDrugSearchResultApiData, mockFhirPatient, mockPatientDrugOrdersApiData } from '__mocks__';
import { getTemplateOrderBasketItem } from '../add-drug-order/drug-search/drug-search.resource';
import DrugOrderBasketPanel from './drug-order-basket-panel.extension';

const mockUseOrderBasket = jest.fn();

jest.mock('@openmrs/esm-patient-common-lib', () => ({
  ...jest.requireActual('@openmrs/esm-patient-common-lib'),
  useOrderBasket: () => mockUseOrderBasket(),
}));

const testProps: OrderBasketExtensionProps = {
  patient: mockFhirPatient,
  launchDrugOrderForm: jest.fn(),
  launchLabOrderForm: jest.fn(),
  launchGeneralOrderForm: jest.fn(),
};

describe('OrderBasketPanel', () => {
  test('renders an empty state when no items are selected in the order basket', () => {
    mockUseOrderBasket.mockReturnValue({ orders: [] });
    render(<DrugOrderBasketPanel {...testProps} />);
    expect(screen.getByRole('heading', { name: /Drug orders \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
  });

  test('renders a tile-based layout of orders, including new, renewing, modifying, and discontinuing', async () => {
    const user = userEvent.setup();
    const medications = [
      getTemplateOrderBasketItem(mockDrugSearchResultApiData[0], null),
      ...mockPatientDrugOrdersApiData.slice(0, 3),
    ] as Array<DrugOrderBasketItem>;
    medications[1].action = 'REVISE';
    medications[2].action = 'RENEW';
    medications[3].action = 'DISCONTINUE';
    let orders = [...medications];
    const mockSetOrders = jest.fn((newOrders: Array<DrugOrderBasketItem>) => {
      orders = newOrders;
    });
    mockUseOrderBasket.mockImplementation(() => ({
      orders: orders,
      setOrders: mockSetOrders,
    }));
    const { rerender } = render(<DrugOrderBasketPanel {...testProps} />);
    expect(screen.getByText(/Drug orders \(4\)/i)).toBeInTheDocument();
    expect(getByTextWithMarkup(/New\s*Aspirin 81mg — 81mg — Tablet/i)).toBeVisible();
    expect(getByTextWithMarkup(/Modify\s*Aspirin 162.5mg — 162.5mg — tablet/i)).toBeVisible();
    expect(getByTextWithMarkup(/Renew\s*Sulfacetamide 0.1 — 10%/i)).toBeVisible();
    expect(getByTextWithMarkup(/Discontinue\s*Acetaminophen 325 mg — 325mg — tablet/i)).toBeVisible();
    const removeAspirin81Button = screen.getAllByRole('button', { name: /remove from basket/i })[0];
    expect(removeAspirin81Button).toBeVisible();
    await user.click(removeAspirin81Button);
    rerender(<DrugOrderBasketPanel {...testProps} />); // re-render because the mocked hook does not trigger a render
    await expect(screen.getByText(/Drug Orders \(3\)/i)).toBeInTheDocument();
  });

  test('disables returned prescription order edits until DTP response allows changes', async () => {
    const user = userEvent.setup();
    const returnedOrder = {
      ...getTemplateOrderBasketItem(mockDrugSearchResultApiData[0], null),
      action: 'REVISE',
      isReturnedPrescription: true,
    } as DrugOrderBasketItem & { isReturnedPrescription: boolean; dtpResponse?: string };
    let orders = [returnedOrder];
    const mockSetOrders = jest.fn((newOrders: Array<DrugOrderBasketItem>) => {
      orders = newOrders as typeof orders;
    });
    mockUseOrderBasket.mockImplementation(() => ({
      orders,
      setOrders: mockSetOrders,
    }));

    const { rerender } = render(<DrugOrderBasketPanel {...testProps} />);

    expect(screen.getByText(/orders cannot be changed until then/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add medication/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /remove from basket/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/dtp response/i), 'ACCEPTED');
    rerender(<DrugOrderBasketPanel {...testProps} />);

    expect(screen.getByText(/you can now update or remove orders/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add medication/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /remove from basket/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/dtp response/i), 'REJECTED');
    rerender(<DrugOrderBasketPanel {...testProps} />);

    expect(screen.getByText(/resubmitted without changes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add medication/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /remove from basket/i })).not.toBeInTheDocument();
  });

  test('renders and stores DTP response for returned prescription orders', async () => {
    const user = userEvent.setup();
    const returnedOrder = {
      ...getTemplateOrderBasketItem(mockDrugSearchResultApiData[0], null),
      action: 'REVISE',
      isReturnedPrescription: true,
    } as DrugOrderBasketItem & {
      isReturnedPrescription: boolean;
      dtpResponse?: string;
      dtpResponseConceptUuid?: string;
    };
    let orders = [returnedOrder];
    const mockSetOrders = jest.fn((newOrders: Array<DrugOrderBasketItem>) => {
      orders = newOrders as typeof orders;
    });
    mockUseOrderBasket.mockImplementation(() => ({
      orders,
      setOrders: mockSetOrders,
    }));
    render(<DrugOrderBasketPanel {...testProps} />);

    const dtpResponse = screen.getByLabelText(/dtp response/i);
    expect(dtpResponse).toBeInTheDocument();
    expect(screen.getByText(/dtp response is required/i)).toBeInTheDocument();
    expect(mockSetOrders).toHaveBeenCalledWith([expect.objectContaining({ isOrderIncomplete: true })]);

    await user.selectOptions(dtpResponse, 'PARTIALLY_ACCEPTED');

    expect(mockSetOrders).toHaveBeenCalledWith([
      expect.objectContaining({
        dtpResponse: 'PARTIALLY_ACCEPTED',
        dtpResponseConceptUuid: undefined,
        isOrderIncomplete: false,
        isReturnedPrescription: true,
      }),
    ]);
  });
});
