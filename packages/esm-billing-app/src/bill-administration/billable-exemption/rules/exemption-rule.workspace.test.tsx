import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import ExemptionRuleWorkspace from './exemption-rule.workspace';
import { updateExemptions, useExemptionsSetting, useLoginLocations, usePrograms } from '../exemptions.resource';
import { useBillableServices } from '../../service-catalog/billable-service.resource';
import { emptyConfig, parseExemptions, serializeExemptions } from '../exemption-rules.utils';

jest.mock('../exemptions.resource', () => ({
  updateExemptions: jest.fn(),
  useExemptionsSetting: jest.fn(),
  useLoginLocations: jest.fn(),
  usePrograms: jest.fn(),
}));

jest.mock('../../service-catalog/billable-service.resource', () => ({
  useBillableServices: jest.fn(),
}));

jest.mock('../../service-catalog/commodity/useCommodityItem', () => ({
  useCommodityItem: jest.fn(() => ({ stockItems: [], isLoading: false })),
}));

const mockUpdateExemptions = jest.mocked(updateExemptions);
const mockUseExemptionsSetting = jest.mocked(useExemptionsSetting);

const testProps = {
  closeWorkspace: jest.fn(),
  promptBeforeClosing: jest.fn(),
  closeWorkspaceWithSavedChanges: jest.fn(),
  setTitle: jest.fn(),
};

/** Runs the change passed to updateExemptions against `current` and returns the resulting JSON. */
const savedJson = (current = emptyConfig()) => serializeExemptions(mockUpdateExemptions.mock.calls[0][0](current));

describe('ExemptionRuleWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateExemptions.mockResolvedValue(undefined);
    mockUseExemptionsSetting.mockReturnValue({
      config: emptyConfig(),
      raw: '',
      settingUuid: 'setting-uuid',
      parseError: null,
      error: undefined,
      isLoading: false,
    });
    jest.mocked(useLoginLocations).mockReturnValue({
      locations: [
        { uuid: 'loc-1', name: 'Gynecology & Obstetric Department' },
        { uuid: 'loc-2', name: 'Main Pharmacy' },
      ],
      error: undefined,
      isLoading: false,
    });
    jest.mocked(usePrograms).mockReturnValue({
      programs: [{ uuid: 'prog-1', name: 'HIV' }],
      error: undefined,
      isLoading: false,
    });
    jest.mocked(useBillableServices).mockReturnValue({
      billableServices: [
        { uuid: 'svc-1', name: 'Antepartum Hemorrhage', concept: { uuid: 'concept-228', display: 'APH' } },
        { uuid: 'svc-2', name: 'Malaria Smear', concept: { uuid: 'concept-32', display: 'Malaria' } },
      ],
      isLoading: false,
      isValidating: false,
      error: undefined,
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useBillableServices>);
  });

  it('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<ExemptionRuleWorkspace {...testProps} />);

    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(await screen.findByText(/this field is required/i)).toBeInTheDocument();
    expect(screen.getByText(/add at least one item, or exempt all items/i)).toBeInTheDocument();
    expect(mockUpdateExemptions).not.toHaveBeenCalled();
  });

  it('saves a location rule for a billable service using the concept UUID', async () => {
    const user = userEvent.setup();
    render(<ExemptionRuleWorkspace {...testProps} />);

    await user.click(screen.getByRole('combobox', { name: /location/i }));
    await user.click(screen.getByText('Gynecology & Obstetric Department'));
    await user.click(screen.getByRole('combobox', { name: /exempted services/i }));
    await user.click(screen.getByText('Antepartum Hemorrhage'));
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    await waitFor(() => expect(mockUpdateExemptions).toHaveBeenCalledTimes(1));
    expect(savedJson()).toEqual({
      services: {
        'location:Gynecology & Obstetric Department': [
          { concept: 'concept-228', description: 'Antepartum Hemorrhage' },
        ],
      },
      commodities: {},
    });
    expect(testProps.closeWorkspaceWithSavedChanges).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('saves an "exempt all services" rule as an empty list', async () => {
    const user = userEvent.setup();
    render(<ExemptionRuleWorkspace {...testProps} />);

    await user.click(screen.getByRole('combobox', { name: /location/i }));
    await user.click(screen.getByText('Main Pharmacy'));
    await user.click(screen.getByRole('switch', { name: /exempt all services/i }));
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    await waitFor(() => expect(mockUpdateExemptions).toHaveBeenCalledTimes(1));
    expect(savedJson().services).toEqual({ 'location:Main Pharmacy:all': [] });
  });

  it('replaces the edited rule when its key changes', async () => {
    const user = userEvent.setup();
    const current = parseExemptions(
      JSON.stringify({
        services: { 'location:Main Pharmacy': [{ concept: 'concept-32', description: 'Malaria Smear' }] },
      }),
    );
    render(<ExemptionRuleWorkspace {...testProps} initialRule={current.rules[0]} />);

    await user.click(screen.getByRole('switch', { name: /exempt all services/i }));
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    await waitFor(() => expect(mockUpdateExemptions).toHaveBeenCalledTimes(1));
    expect(savedJson(current).services).toEqual({ 'location:Main Pharmacy:all': [] });
  });

  it('does not offer a service that is already selected with a legacy concept ID', async () => {
    const user = userEvent.setup();
    const current = parseExemptions(
      JSON.stringify({
        services: { 'location:Main Pharmacy': [{ concept: 228, description: 'Antepartum Hemorrhage' }] },
      }),
    );
    render(<ExemptionRuleWorkspace {...testProps} initialRule={current.rules[0]} />);

    await user.click(screen.getByRole('combobox', { name: /exempted services/i }));

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Malaria Smear']);
  });

  it('shows an error snackbar when saving fails', async () => {
    const user = userEvent.setup();
    mockUpdateExemptions.mockRejectedValue(new Error('Network down'));
    render(<ExemptionRuleWorkspace {...testProps} />);

    await user.click(screen.getByRole('combobox', { name: /location/i }));
    await user.click(screen.getByText('Main Pharmacy'));
    await user.click(screen.getByRole('switch', { name: /exempt all services/i }));
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error', subtitle: 'Network down' })),
    );
    expect(testProps.closeWorkspaceWithSavedChanges).not.toHaveBeenCalled();
  });
});
