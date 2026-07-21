import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Order, useOrderBasket } from '@openmrs/esm-patient-common-lib';
import { formatDate, openmrsFetch, useConfig, useSession } from '@openmrs/esm-framework';
import { mockPatientDrugOrdersApiData, mockSessionDataResponse } from '__mocks__';
import MedicationsDetailsTable from './medications-details-table.component';
import { mockPatient, renderWithSwr } from 'tools';

const mockUseOrderBasket = jest.mocked(useOrderBasket);
const mockUseConfig = jest.mocked(useConfig);
const mockUseSession = jest.mocked(useSession);
const mockOpenmrsFetch = openmrsFetch as jest.Mock;
const mockLaunchOrderBasket = jest.fn();
const mockLaunchReturnedPrescriptionBasket = jest.fn();
const mockSetOrders = jest.fn();

const dtpPharmacyReturn = {
  groupConceptUuid: 'dtp-group-uuid',
  categoryConceptUuid: 'dtp-category-uuid',
  reasonConceptUuid: 'dtp-reason-uuid',
  noteConceptUuid: 'dtp-note-uuid',
  responseConceptUuid: 'dtp-response-uuid',
};

type DtpReturnGroupInput = {
  obsDatetime: string;
  dateCreated?: string;
  category?: string;
  reason?: string;
  note?: string;
};

function buildReturnGroupObs({ obsDatetime, dateCreated, category, reason, note }: DtpReturnGroupInput) {
  const created = dateCreated ?? obsDatetime;
  return {
    uuid: `grp-${created}`,
    obsDatetime,
    dateCreated: created,
    concept: { uuid: dtpPharmacyReturn.groupConceptUuid },
    groupMembers: [
      category != null ? { concept: { uuid: dtpPharmacyReturn.categoryConceptUuid }, value: category } : null,
      reason != null ? { concept: { uuid: dtpPharmacyReturn.reasonConceptUuid }, value: reason } : null,
      note != null ? { concept: { uuid: dtpPharmacyReturn.noteConceptUuid }, value: note } : null,
    ].filter(Boolean),
  };
}

type DtpResponseInput = {
  obsDatetime: string;
  dateCreated?: string;
};

function buildEncounterObsResponse(
  uuid: string,
  groups: Array<DtpReturnGroupInput>,
  responses: Array<DtpResponseInput | string> = [],
) {
  return {
    uuid,
    obs: [
      ...groups.map(buildReturnGroupObs),
      ...responses.map((response) => {
        const obsDatetime = typeof response === 'string' ? response : response.obsDatetime;
        const dateCreated = typeof response === 'string' ? response : response.dateCreated ?? response.obsDatetime;
        return {
          uuid: `resp-${dateCreated}`,
          obsDatetime,
          dateCreated,
          concept: { uuid: dtpPharmacyReturn.responseConceptUuid },
          value: { uuid: 'answer-uuid', display: 'Accepted' },
        };
      }),
    ],
  };
}

type FailedSyncFixture = { reason?: string | null };

/**
 * Routes openmrsFetch by URL: encounter obs requests resolve from `encounterObsByUuid`,
 * prescription sync status requests resolve from `failedSyncByEncounterUuid`, everything else
 * (e.g. MedicationDispense) falls back to an empty FHIR bundle.
 */
function mockFetchByUrl(
  encounterObsByUuid: Record<string, ReturnType<typeof buildEncounterObsResponse>>,
  failedSyncByEncounterUuid: Record<string, FailedSyncFixture> = {},
) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    const encounterMatch = url.match(/\/encounter\/([^?]+)/);
    if (encounterMatch) {
      const data = encounterObsByUuid[encounterMatch[1]] ?? { uuid: encounterMatch[1], obs: [] };
      return Promise.resolve({ data });
    }
    const syncStatusMatch = url.match(/prescriptionOutbox\/status\?encounters=(.+)/);
    if (syncStatusMatch) {
      const encounterUuids = syncStatusMatch[1].split(',');
      const results = encounterUuids
        .filter((uuid) => failedSyncByEncounterUuid[uuid])
        .map((uuid) => ({
          encounterUuid: uuid,
          outcomeStatus: 'FAILED',
          reason: failedSyncByEncounterUuid[uuid].reason,
        }));
      return Promise.resolve({ data: { results } });
    }
    return Promise.resolve({ data: { entry: [] } });
  });
}

jest.mock('@openmrs/esm-patient-common-lib', () => ({
  ...jest.requireActual('@openmrs/esm-patient-common-lib'),
  useOrderBasket: jest.fn(),
  useLaunchWorkspaceRequiringVisit: jest.fn((_patientUuid, workspaceName) => {
    if (workspaceName === 'returned-prescription-basket-ethio') {
      return mockLaunchReturnedPrescriptionBasket;
    }
    if (workspaceName === 'order-basket') {
      return mockLaunchOrderBasket;
    }
    return jest.fn();
  }),
}));

describe('MedicationsDetailsTable', () => {
  beforeEach(() => {
    mockSetOrders.mockClear();
    mockLaunchOrderBasket.mockClear();
    mockLaunchReturnedPrescriptionBasket.mockClear();
    mockOpenmrsFetch.mockReset();
    mockOpenmrsFetch.mockImplementation(() => Promise.resolve({ data: { entry: [] } }));
    mockUseSession.mockReturnValue(mockSessionDataResponse.data);

    mockUseOrderBasket.mockReturnValue({
      orders: [],
      setOrders: mockSetOrders,
      clearOrders: jest.fn(),
    });

    mockUseConfig.mockReturnValue({
      showPrintButton: false,
      excludePatientIdentifierCodeTypes: { uuids: [] },
      dtpPharmacyReturn,
    });
  });

  function medicationNamesInTableOrder(table: HTMLElement, drugNamePattern: RegExp): Array<string> {
    const names: Array<string> = [];
    for (const row of within(table).getAllByRole('row')) {
      const label = within(row).queryByText(drugNamePattern);
      if (label?.textContent) {
        names.push(label.textContent.trim());
      }
    }
    return names;
  }

  test('sorting by start date reorders medication rows within encounter groups', async () => {
    const user = userEvent.setup();
    const encounter = {
      uuid: 'enc-sort-test',
      display: 'Encounter',
      encounterDatetime: '2026-04-27T12:00:00',
    };
    const newerLaterInList = {
      ...mockPatientDrugOrdersApiData[0],
      uuid: 'med-newer',
      dateActivated: '2026-05-02T10:00:00.000+0000',
      drug: {
        ...mockPatientDrugOrdersApiData[0].drug,
        display: 'Sorttest newer drug',
      },
      encounter,
    };
    const olderEarlierInList = {
      ...mockPatientDrugOrdersApiData[1],
      uuid: 'med-older',
      dateActivated: '2026-05-01T10:00:00.000+0000',
      drug: {
        ...mockPatientDrugOrdersApiData[1].drug,
        display: 'Sorttest older drug',
      },
      encounter,
    };
    const medications = [newerLaterInList, olderEarlierInList] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const table = await screen.findByRole('table', { name: /medications/i });

    const drugPattern = /^Sorttest (newer|older) drug$/;

    expect(medicationNamesInTableOrder(table, drugPattern)).toEqual(['Sorttest newer drug', 'Sorttest older drug']);

    const startDateHeader = screen.getByRole('columnheader', { name: /start date/i });
    await user.click(within(startDateHeader).getByRole('button'));

    expect(medicationNamesInTableOrder(table, drugPattern)).toEqual(['Sorttest older drug', 'Sorttest newer drug']);
  });

  test('renders encounter date-time group headers', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T10:13:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-2',
          encounterDatetime: '2026-04-27T10:13:00',
        },
      },
    ] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(
      await screen.findByText(formatDate(new Date('2026-04-27T11:49:00'), { time: true }), { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatDate(new Date('2026-04-27T10:13:00'), { time: true }), { exact: false }),
    ).toBeInTheDocument();
  });

  test('renders unknown encounter date when encounter has uuid but no encounterDatetime', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          uuid: 'enc-1',
          display: 'Encounter',
        },
      },
    ] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByText(/unknown date/i)).toBeInTheDocument();
  });

  test('marks an encounter group as returned when the encounter has a DTP pharmacy return group obs', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({
      'enc-1': buildEncounterObsResponse('enc-1', [
        {
          obsDatetime: '2026-04-27T12:00:00.000+0000',
          category: 'Dosing',
          reason: 'Inappropriate dose',
          note: 'Please revise to 2.5mg',
        },
      ]),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByText(/prescription returned/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend prescription/i })).toBeInTheDocument();
    expect(screen.getByText(/Reason 1/i)).toBeInTheDocument();
    expect(screen.getByText('Inappropriate dose')).toBeInTheDocument();
    expect(screen.getByText('Dosing')).toBeInTheDocument();
    expect(screen.getByText(/Please revise to 2\.5mg/)).toBeInTheDocument();
    expect(screen.queryByText('Returned')).not.toBeInTheDocument();
    expect(document.querySelector('.cds--tag--purple')).toBeInTheDocument();
  });

  test('renders one line per DTP return reason group', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({
      'enc-1': buildEncounterObsResponse('enc-1', [
        { obsDatetime: '2026-04-27T12:00:00.000+0000', category: 'Dosing', reason: 'Inappropriate dose' },
        { obsDatetime: '2026-04-27T12:05:00.000+0000', category: 'Interaction', reason: 'Drug interaction' },
      ]),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByText(/Reason 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason 2/i)).toBeInTheDocument();
    expect(screen.getByText('Inappropriate dose')).toBeInTheDocument();
    expect(screen.getByText('Drug interaction')).toBeInTheDocument();
  });

  test('hides the returned tag when a DTP response is same-or-newer than the latest return group', async () => {
    const sharedObsDatetime = '2026-06-22T09:41:33.000+0000';
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({
      'enc-1': buildEncounterObsResponse(
        'enc-1',
        [
          {
            obsDatetime: sharedObsDatetime,
            dateCreated: '2026-06-22T09:41:51.000+0000',
            category: 'Dosing',
            reason: 'Inappropriate dose',
          },
        ],
        [{ obsDatetime: sharedObsDatetime, dateCreated: '2026-06-22T09:42:39.000+0000' }],
      ),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByRole('button', { name: /renew all/i })).toBeInTheDocument();
    expect(screen.queryByText(/prescription returned/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend prescription/i })).not.toBeInTheDocument();
  });

  test('re-shows the returned tag when a newer return group arrives after a DTP response', async () => {
    const sharedObsDatetime = '2026-06-22T09:41:33.000+0000';
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({
      'enc-1': buildEncounterObsResponse(
        'enc-1',
        [
          {
            obsDatetime: sharedObsDatetime,
            dateCreated: '2026-06-22T09:43:33.000+0000',
            category: 'Dosing',
            reason: 'Still wrong dose',
          },
        ],
        [{ obsDatetime: sharedObsDatetime, dateCreated: '2026-06-22T09:42:39.000+0000' }],
      ),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByText(/prescription returned/i)).toBeInTheDocument();
    expect(screen.getByText('Still wrong dose')).toBeInTheDocument();
  });

  test('does not mark an encounter group as returned when the encounter has no DTP return group obs', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({ 'enc-1': buildEncounterObsResponse('enc-1', []) });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByRole('button', { name: /renew all/i })).toBeInTheDocument();
    expect(screen.queryByText(/prescription returned/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend prescription/i })).not.toBeInTheDocument();
  });

  test('renders per-order pharmacy fulfillment status tags from fulfiller status and status reason', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-dispensed',
        fulfillerStatus: 'COMPLETED',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-dispensed',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-declined',
        fulfillerStatus: 'DECLINED',
        statusReasonCodeableConcept: {
          text: 'out-of-stock',
        },
        dateActivated: '2026-04-27T10:13:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-declined',
          encounterDatetime: '2026-04-27T10:13:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[2],
        uuid: 'med-cancelled',
        fulfillerStatus: 'DECLINED',
        statusReasonCodeableConcept: {
          coding: [{ code: 'cancelled', display: 'cancelled' }],
        },
        dateActivated: '2026-04-27T09:00:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-cancelled',
          encounterDatetime: '2026-04-27T09:00:00',
        },
      },
    ] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Past Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton={false}
        showModifyButton={false}
        showRenewButton
      />,
    );

    expect(await screen.findByText('Dispensed')).toBeInTheDocument();
    expect(screen.getByText('Stocked out')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByText('out-of-stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Not dispensed')).not.toBeInTheDocument();
  });

  test('renders Stocked out for Supplies not available status reason', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-supplies-not-available',
        fulfillerStatus: 'DECLINED',
        statusReasonCodeableConcept: {
          coding: [{ display: 'Supplies not available' }],
        },
        dateActivated: '2026-04-27T10:13:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-supplies-not-available',
          encounterDatetime: '2026-04-27T10:13:00',
        },
      },
    ] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Past Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton={false}
        showModifyButton={false}
        showRenewButton
      />,
    );

    expect(await screen.findByText('Stocked out')).toBeInTheDocument();
    expect(screen.queryByText('Not dispensed')).not.toBeInTheDocument();
    expect(screen.queryByText('Supplies not available')).not.toBeInTheDocument();
  });

  test('renders renew all only for encounter groups with a valid encounter uuid', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T10:13:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: undefined,
          encounterDatetime: '2026-04-27T10:13:00',
        },
      },
    ] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const renewAllButtons = await screen.findAllByRole('button', { name: /renew all/i });
    expect(renewAllButtons).toHaveLength(1);
  });

  test('clicking renew all adds encounter orders to basket and launches order basket with encounter uuid', async () => {
    const user = userEvent.setup();
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const renewAllButton = await screen.findByRole('button', { name: /renew all/i });
    await user.click(renewAllButton);

    expect(mockSetOrders).toHaveBeenCalledTimes(1);
    const nextBasketItems = mockSetOrders.mock.calls[0][0] as Array<Order>;
    expect(nextBasketItems).toHaveLength(2);
    expect(nextBasketItems.every((order) => order.action === 'RENEW')).toBe(true);
    expect(mockLaunchOrderBasket).toHaveBeenCalledWith({}, { encounterUuid: 'enc-1' });
    expect(mockLaunchReturnedPrescriptionBasket).not.toHaveBeenCalled();
  });

  test('does not render resend prescription button when showResendPrescriptionButton is false', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({
      'enc-1': buildEncounterObsResponse('enc-1', [
        { obsDatetime: '2026-04-27T12:00:00.000+0000', category: 'Dosing', reason: 'Inappropriate dose' },
      ]),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Past Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton={false}
        showModifyButton={false}
        showRenewButton
        showResendPrescriptionButton={false}
      />,
    );

    expect(await screen.findByText(/prescription returned/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend prescription/i })).not.toBeInTheDocument();
  });

  test('clicking resend prescription adds returned encounter orders to basket as revise orders', async () => {
    const user = userEvent.setup();
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({
      'enc-1': buildEncounterObsResponse('enc-1', [
        { obsDatetime: '2026-04-27T12:00:00.000+0000', category: 'Dosing', reason: 'Inappropriate dose' },
      ]),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const resendButton = await screen.findByRole('button', { name: /resend prescription/i });
    await user.click(resendButton);

    expect(mockSetOrders).toHaveBeenCalledTimes(1);
    const nextBasketItems = mockSetOrders.mock.calls[0][0] as Array<Order>;
    expect(nextBasketItems).toHaveLength(2);
    expect(nextBasketItems.every((order) => order.action === 'REVISE')).toBe(true);
    expect(
      nextBasketItems.every((order) => (order as Order & { isReturnedPrescription?: boolean }).isReturnedPrescription),
    ).toBe(true);
    expect(mockLaunchReturnedPrescriptionBasket).toHaveBeenCalledWith({}, { encounterUuid: 'enc-1' });
    expect(mockLaunchOrderBasket).not.toHaveBeenCalled();
  });

  test('clicking renew all does not duplicate orders that are already in basket', async () => {
    const user = userEvent.setup();
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockUseOrderBasket.mockReturnValue({
      orders: [{ ...medications[0], action: 'NEW' }] as any,
      setOrders: mockSetOrders,
      clearOrders: jest.fn(),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const renewAllButton = await screen.findByRole('button', { name: /renew all/i });
    await user.click(renewAllButton);

    expect(mockSetOrders).toHaveBeenCalledTimes(1);
    const nextBasketItems = mockSetOrders.mock.calls[0][0] as Array<Order>;
    expect(nextBasketItems).toHaveLength(2);
    expect(nextBasketItems.filter((order) => order.uuid === 'med-1')).toHaveLength(1);
    expect(nextBasketItems.filter((order) => order.uuid === 'med-2' && order.action === 'RENEW')).toHaveLength(1);
  });

  test('disables renew all when all encounter orders are already in basket', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockUseOrderBasket.mockReturnValue({
      orders: medications.map((order) => ({ ...order, action: 'NEW' })) as any,
      setOrders: mockSetOrders,
      clearOrders: jest.fn(),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const renewAllButton = await screen.findByRole('button', { name: /renew all/i });
    expect(renewAllButton).toBeDisabled();
  });

  test('clicking disabled renew all does not mutate basket or launch workspace', async () => {
    const user = userEvent.setup();
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
      {
        ...mockPatientDrugOrdersApiData[1],
        uuid: 'med-2',
        dateActivated: '2026-04-27T11:50:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[1].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockUseOrderBasket.mockReturnValue({
      orders: medications.map((order) => ({ ...order, action: 'NEW' })) as any,
      setOrders: mockSetOrders,
      clearOrders: jest.fn(),
    });

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    const renewAllButton = await screen.findByRole('button', { name: /renew all/i });
    expect(renewAllButton).toBeDisabled();

    await user.click(renewAllButton);

    expect(mockSetOrders).not.toHaveBeenCalled();
    expect(mockLaunchOrderBasket).not.toHaveBeenCalled();
  });

  test('renders a sync failed tag and reason when the latest prescription sync attempt failed', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl(
      { 'enc-1': buildEncounterObsResponse('enc-1', []) },
      { 'enc-1': { reason: 'eAPTS rejected the prescription' } },
    );

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    expect(await screen.findByText(/sync failed/i)).toBeInTheDocument();
    expect(screen.getByText('eAPTS rejected the prescription')).toBeInTheDocument();
    expect(document.querySelector('.cds--tag--red')).toBeInTheDocument();
  });

  test('does not render a sync failed tag when showFailedSyncStatus is false', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl(
      { 'enc-1': buildEncounterObsResponse('enc-1', []) },
      { 'enc-1': { reason: 'eAPTS rejected the prescription' } },
    );

    renderWithSwr(
      <MedicationsDetailsTable
        title="Past Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton={false}
        showModifyButton={false}
        showRenewButton
        showFailedSyncStatus={false}
      />,
    );

    await screen.findByRole('table', { name: /medications/i });
    expect(screen.queryByText(/sync failed/i)).not.toBeInTheDocument();
  });

  test('does not render a sync failed tag when there is no failed sync for the encounter', async () => {
    const medications = [
      {
        ...mockPatientDrugOrdersApiData[0],
        uuid: 'med-1',
        dateActivated: '2026-04-27T11:49:00',
        encounter: {
          ...mockPatientDrugOrdersApiData[0].encounter,
          uuid: 'enc-1',
          encounterDatetime: '2026-04-27T11:49:00',
        },
      },
    ] as unknown as Array<Order>;

    mockFetchByUrl({ 'enc-1': buildEncounterObsResponse('enc-1', []) }, {});

    renderWithSwr(
      <MedicationsDetailsTable
        title="Active Medications"
        medications={medications}
        patient={mockPatient}
        showDiscontinueButton
        showModifyButton
        showRenewButton
      />,
    );

    await screen.findByRole('table', { name: /medications/i });
    expect(screen.queryByText(/sync failed/i)).not.toBeInTheDocument();
  });
});
