import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { type CreditCompany } from '../../types';
import CreditCompanyWorkspace from './credit-company.workspace';
import { saveCreditCompany } from './credit-company.resource';

const mockSaveCreditCompany = jest.mocked(saveCreditCompany);
const mockShowSnackbar = jest.mocked(showSnackbar);

jest.mock('./credit-company.resource', () => ({
  ...jest.requireActual('./credit-company.resource'),
  saveCreditCompany: jest.fn(),
  mutateCreditCompanies: jest.fn(),
}));

const testProps = {
  closeWorkspace: jest.fn(),
  promptBeforeClosing: jest.fn(),
  closeWorkspaceWithSavedChanges: jest.fn(),
  setTitle: jest.fn(),
};

describe('CreditCompanyWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires a company name and saves a new company', async () => {
    const user = userEvent.setup();
    mockSaveCreditCompany.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof saveCreditCompany>>);
    render(<CreditCompanyWorkspace {...testProps} />);

    const nameInput = screen.getByRole('textbox', { name: /company name/i });
    await user.type(nameInput, 'x');
    await user.clear(nameInput);
    expect(await screen.findByText(/company name is required/i)).toBeInTheDocument();

    await user.type(nameInput, '  Ethio Telecom ');
    await user.type(screen.getByRole('textbox', { name: /description/i }), 'Staff contract');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(mockSaveCreditCompany).toHaveBeenCalledWith(
      { name: 'Ethio Telecom', description: 'Staff contract' },
      undefined,
    );
    expect(testProps.closeWorkspaceWithSavedChanges).toHaveBeenCalled();
  });

  test('edits an existing company, showing its name unescaped', async () => {
    const user = userEvent.setup();
    mockSaveCreditCompany.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof saveCreditCompany>>);
    const company = {
      uuid: 'company-uuid',
      display: 'Smith &amp; Sons',
      name: 'Smith &amp; Sons',
      description: '',
      retired: false,
    } as CreditCompany;
    render(<CreditCompanyWorkspace {...testProps} initialCreditCompany={company} />);

    const nameInput = screen.getByRole('textbox', { name: /company name/i });
    expect(nameInput).toHaveValue('Smith & Sons');

    await user.type(nameInput, ' PLC');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(mockSaveCreditCompany).toHaveBeenCalledWith({ name: 'Smith & Sons PLC', description: '' }, 'company-uuid');
  });

  test('shows the server message when saving fails', async () => {
    const user = userEvent.setup();
    mockSaveCreditCompany.mockRejectedValue({
      responseBody: { error: { message: "A credit company named 'Ethio Telecom' already exists" } },
    });
    render(<CreditCompanyWorkspace {...testProps} />);

    await user.type(screen.getByRole('textbox', { name: /company name/i }), 'Ethio Telecom');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        subtitle: "A credit company named 'Ethio Telecom' already exists",
      }),
    );
    expect(testProps.closeWorkspaceWithSavedChanges).not.toHaveBeenCalled();
  });
});
