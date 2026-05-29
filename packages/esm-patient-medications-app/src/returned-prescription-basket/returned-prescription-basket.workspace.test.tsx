import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, restBaseUrl, showSnackbar, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import {
  type DrugOrderBasketItem,
  type OrderBasketWindowProps,
  type PatientWorkspace2DefinitionProps,
  showOrderSuccessToast,
  useMutatePatientOrders,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import { mockDrugSearchResultApiData, mockFhirPatient, mockSessionDataResponse } from '__mocks__';
import { getTemplateOrderBasketItem } from '../add-drug-order/drug-search/drug-search.resource';
import { mockPatient, renderWithSwr } from 'tools';
import ReturnedPrescriptionBasketWorkspace from './returned-prescription-basket.workspace';

const mockOpenmrsFetch = openmrsFetch as jest.Mock;
const mockShowSnackbar = showSnackbar as jest.Mock;
const mockShowOrderSuccessToast = jest.mocked(showOrderSuccessToast);
const mockUseConfig = jest.mocked(useConfig);
const mockUseSession = jest.mocked(useSession);
const mockUseOrderBasket = jest.mocked(useOrderBasket);
const mockUseMutatePatientOrders = jest.mocked(useMutatePatientOrders);
const mockMutateOrders = jest.fn();
const mockCloseWorkspace = jest.fn();
const mockMutateVisitContext = jest.fn();
const mockSetOrders = jest.fn();

const dtpQuestionConceptUuid = '1556AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const dtpAcceptedConceptUuid = '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const orderEncounterTypeUuid = 'order-encounter-type-uuid';
const encounterUuid = 'enc-1';

const mockVisitContext: Visit = {
  uuid: 'visit-uuid',
  startDatetime: '2026-01-01T00:00:00.000+0000',
  stopDatetime: null,
  visitType: {
    uuid: 'visit-type-uuid',
    display: 'Outpatient',
  },
};

type ReturnedPrescriptionBasketItem = DrugOrderBasketItem & {
  isReturnedPrescription?: boolean;
  dtpResponseConceptUuid?: string;
};

jest.mock('../drug-order-basket-panel/drug-order-basket-panel.extension', () => ({
  __esModule: true,
  default: () => <div data-testid="drug-order-basket-panel" />,
}));

jest.mock('@openmrs/esm-patient-common-lib', () => ({
  ...jest.requireActual('@openmrs/esm-patient-common-lib'),
  useOrderBasket: jest.fn(),
  useMutatePatientOrders: jest.fn(),
  showOrderSuccessToast: jest.fn(),
}));

function createReturnedOrder(overrides: Partial<ReturnedPrescriptionBasketItem> = {}) {
  return {
    ...getTemplateOrderBasketItem(mockDrugSearchResultApiData[0], null),
    action: 'REVISE',
    isReturnedPrescription: true,
    dtpResponseConceptUuid: dtpAcceptedConceptUuid,
    ...overrides,
  } as ReturnedPrescriptionBasketItem;
}

function createOtherBasketOrder() {
  return {
    ...getTemplateOrderBasketItem(mockDrugSearchResultApiData[1], null),
    action: 'NEW',
  } as DrugOrderBasketItem;
}

const defaultWorkspaceProps: PatientWorkspace2DefinitionProps<{}, OrderBasketWindowProps> = {
  closeWorkspace: mockCloseWorkspace,
  launchChildWorkspace: jest.fn(),
  workspaceProps: {},
  workspaceName: 'returned-prescription-basket-ethio',
  windowProps: { encounterUuid },
  windowName: 'order-basket',
  isRootWorkspace: false,
  groupProps: {
    patient: mockFhirPatient,
    patientUuid: mockPatient.id,
    visitContext: mockVisitContext,
    mutateVisitContext: mockMutateVisitContext,
  },
};

function renderWorkspace(orders: Array<DrugOrderBasketItem>) {
  mockUseOrderBasket.mockReturnValue({
    orders,
    setOrders: mockSetOrders,
    clearOrders: jest.fn(),
  });

  return renderWithSwr(<ReturnedPrescriptionBasketWorkspace {...defaultWorkspaceProps} />);
}

describe('ReturnedPrescriptionBasketWorkspace', () => {
  beforeEach(() => {
    mockSetOrders.mockClear();
    mockCloseWorkspace.mockClear().mockResolvedValue(undefined);
    mockMutateVisitContext.mockClear();
    mockMutateOrders.mockClear();
    mockOpenmrsFetch.mockClear().mockResolvedValue({ data: {} } as never);
    mockShowSnackbar.mockClear();
    mockShowOrderSuccessToast.mockClear();

    mockUseSession.mockReturnValue(mockSessionDataResponse.data);
    mockUseMutatePatientOrders.mockReturnValue({ mutate: mockMutateOrders });
    mockUseConfig.mockImplementation((options?: { externalModuleName?: string }) => {
      if (options?.externalModuleName === '@openmrs/esm-patient-orders-app') {
        return { orderEncounterType: orderEncounterTypeUuid };
      }
      return {
        dtpResponse: {
          questionConceptUuid: dtpQuestionConceptUuid,
          acceptedConceptUuid: dtpAcceptedConceptUuid,
          rejectedConceptUuid: '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          partiallyAcceptedConceptUuid: '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB',
        },
      };
    });
  });

  test('disables sign and close when DTP response is not selected', () => {
    renderWorkspace([createReturnedOrder({ dtpResponseConceptUuid: undefined })]);

    expect(screen.getByRole('button', { name: /sign and close/i })).toBeDisabled();
  });

  test('cancel removes only returned prescription orders from the basket', async () => {
    const user = userEvent.setup();
    const returnedOrder = createReturnedOrder();
    const otherOrder = createOtherBasketOrder();

    renderWorkspace([returnedOrder, otherOrder]);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockSetOrders).toHaveBeenCalledWith([otherOrder]);
    expect(mockCloseWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  test('sign and close posts encounter update with DTP obs and revise orders', async () => {
    const user = userEvent.setup();
    const returnedOrder = createReturnedOrder();

    renderWorkspace([returnedOrder]);

    await user.click(screen.getByRole('button', { name: /sign and close/i }));

    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalled());
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/encounter/${encounterUuid}`,
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          patient: mockPatient.id,
          location: mockSessionDataResponse.data.sessionLocation.uuid,
          encounterType: orderEncounterTypeUuid,
          visit: 'visit-uuid',
          obs: [
            {
              concept: dtpQuestionConceptUuid,
              value: dtpAcceptedConceptUuid,
            },
          ],
          orders: expect.arrayContaining([
            expect.objectContaining({
              action: 'REVISE',
              type: 'drugorder',
            }),
          ]),
        }),
      }),
    );
    expect(mockSetOrders).toHaveBeenCalledWith([]);
    expect(mockMutateOrders).toHaveBeenCalled();
    expect(mockMutateVisitContext).toHaveBeenCalled();
    expect(mockShowOrderSuccessToast).toHaveBeenCalled();
    expect(mockCloseWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
  });

  test('sign and close keeps non-returned basket orders after success', async () => {
    const user = userEvent.setup();
    const returnedOrder = createReturnedOrder();
    const otherOrder = createOtherBasketOrder();

    renderWorkspace([returnedOrder, otherOrder]);

    await user.click(screen.getByRole('button', { name: /sign and close/i }));

    await waitFor(() => expect(mockSetOrders).toHaveBeenCalled());
    expect(mockSetOrders).toHaveBeenCalledWith([otherOrder]);
  });

  test('shows error snackbar when encounter save fails', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockRejectedValue(new Error('Server error'));

    renderWorkspace([createReturnedOrder()]);

    await user.click(screen.getByRole('button', { name: /sign and close/i }));

    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalled());
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        title: 'Error saving returned prescription',
        subtitle: 'Server error',
      }),
    );
    expect(mockCloseWorkspace).not.toHaveBeenCalled();
    expect(mockShowOrderSuccessToast).not.toHaveBeenCalled();
  });
});
