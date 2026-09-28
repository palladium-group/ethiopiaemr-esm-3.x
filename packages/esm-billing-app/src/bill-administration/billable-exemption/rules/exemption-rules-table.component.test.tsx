import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace, showModal } from '@openmrs/esm-framework';
import ExemptionRulesTable from './exemption-rules-table.component';
import { useExemptionsSetting } from '../exemptions.resource';
import { emptyConfig, parseExemptions } from '../exemption-rules.utils';

jest.mock('../exemptions.resource', () => ({
  useExemptionsSetting: jest.fn(),
}));

const mockUseExemptionsSetting = jest.mocked(useExemptionsSetting);

const settingWith = (raw: string, overrides = {}) => ({
  config: parseExemptions(raw),
  raw,
  settingUuid: 'setting-uuid',
  parseError: null,
  error: undefined,
  isLoading: false,
  ...overrides,
});

describe('ExemptionRulesTable', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists rules in plain language', () => {
    mockUseExemptionsSetting.mockReturnValue(
      settingWith(
        JSON.stringify({
          services: {
            'location:Gynecology & Obstetric Department': [{ concept: 'c-228', description: 'Antepartum Hemorrhage' }],
            'program:TB:all': [],
          },
          commodities: { 'age<5': [{ concept: 'c-1', description: 'ORS' }] },
        }),
      ),
    );

    render(<ExemptionRulesTable />);

    expect(screen.getByText('Patients at Gynecology & Obstetric Department')).toBeInTheDocument();
    expect(screen.getByText('Antepartum Hemorrhage')).toBeInTheDocument();
    expect(screen.getByText('Patients in the TB program')).toBeInTheDocument();
    expect(screen.getByText('All items')).toBeInTheDocument();
    expect(screen.getByText('Patients younger than 5 years')).toBeInTheDocument();
    expect(screen.getByText('ORS')).toBeInTheDocument();
  });

  it('filters rules by search text', async () => {
    const user = userEvent.setup();
    mockUseExemptionsSetting.mockReturnValue(
      settingWith(
        JSON.stringify({
          services: {
            'location:Main Pharmacy': [{ concept: 'c-1', description: 'Malaria Smear' }],
            'program:HIV': [{ concept: 'c-2', description: 'Viral Load' }],
          },
        }),
      ),
    );

    render(<ExemptionRulesTable />);
    await user.type(screen.getByRole('searchbox'), 'viral');

    expect(screen.getByText('Patients in the HIV program')).toBeInTheDocument();
    expect(screen.queryByText('Patients at Main Pharmacy')).not.toBeInTheDocument();
  });

  it('launches the rule workspace from the empty state', async () => {
    const user = userEvent.setup();
    mockUseExemptionsSetting.mockReturnValue(settingWith(''));

    render(<ExemptionRulesTable />);
    await user.click(screen.getByRole('button', { name: /record exemption rules/i }));

    expect(launchWorkspace).toHaveBeenCalledWith('exemption-rule-workspace', expect.any(Object));
  });

  it('opens the delete confirmation for a rule', async () => {
    const user = userEvent.setup();
    mockUseExemptionsSetting.mockReturnValue(
      settingWith(JSON.stringify({ services: { 'location:Main Pharmacy:all': [] } })),
    );

    render(<ExemptionRulesTable />);
    await user.click(screen.getByRole('button', { name: /actions/i }));
    await user.click(screen.getByText('Delete'));

    expect(showModal).toHaveBeenCalledWith(
      'delete-exemption-rule-modal',
      expect.objectContaining({ ruleDescription: 'Patients at Main Pharmacy' }),
    );
  });

  it('warns about entries that can only be edited as JSON and about invalid JSON', () => {
    mockUseExemptionsSetting.mockReturnValue({
      ...settingWith(JSON.stringify({ services: { 'all:all': [] } })),
      parseError: null,
    });
    const { unmount } = render(<ExemptionRulesTable />);
    expect(screen.getByText(/can only be edited as json/i)).toBeInTheDocument();
    expect(screen.getByText('all:all')).toBeInTheDocument();
    unmount();

    mockUseExemptionsSetting.mockReturnValue({
      ...settingWith(''),
      config: emptyConfig(),
      parseError: new Error('Unexpected token'),
    });
    render(<ExemptionRulesTable />);
    expect(screen.getByText(/not valid json/i)).toBeInTheDocument();
  });
});
