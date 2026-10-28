import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { type Organization } from '../../types';
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

const emptyPayload = {
  description: '',
  phone: '',
  email: '',
  address: '',
  tin: '',
  contractNumber: '',
  contractStartDate: null,
  contractEndDate: null,
};

const setDate = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('CreditCompanyWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveCreditCompany.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof saveCreditCompany>>);
  });

  test('requires a company name and saves a new company with all its details', async () => {
    const user = userEvent.setup();
    render(<CreditCompanyWorkspace {...testProps} />);

    const nameInput = screen.getByRole('textbox', { name: /company name/i });
    await user.type(nameInput, 'x');
    await user.clear(nameInput);
    expect(await screen.findByText(/company name is required/i)).toBeInTheDocument();

    await user.type(nameInput, '  Ethio Telecom ');
    await user.type(screen.getByRole('textbox', { name: /phone/i }), '0115505678');
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'finance@ethiotelecom.et');
    await user.type(screen.getByRole('textbox', { name: /address/i }), 'Churchill Ave, Addis Ababa');
    await user.type(screen.getByRole('textbox', { name: /tin/i }), '0000030603');
    await user.type(screen.getByRole('textbox', { name: /contract number/i }), 'CR-2026-014');
    setDate(/contract start date/i, '2026-01-01');
    setDate(/contract end date/i, '2026-12-31');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(mockSaveCreditCompany).toHaveBeenCalledWith(
      {
        name: 'Ethio Telecom',
        description: '',
        phone: '0115505678',
        email: 'finance@ethiotelecom.et',
        address: 'Churchill Ave, Addis Ababa',
        tin: '0000030603',
        contractNumber: 'CR-2026-014',
        contractStartDate: '2026-01-01',
        contractEndDate: '2026-12-31',
      },
      undefined,
    );
    expect(testProps.closeWorkspaceWithSavedChanges).toHaveBeenCalled();
  });

  test('rejects an invalid email', async () => {
    const user = userEvent.setup();
    render(<CreditCompanyWorkspace {...testProps} />);

    await user.type(screen.getByRole('textbox', { name: /company name/i }), 'Ethio Telecom');
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'finance at ethiotelecom');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockSaveCreditCompany).not.toHaveBeenCalled();
  });

  test('rejects a contract that ends before it starts', async () => {
    const user = userEvent.setup();
    render(<CreditCompanyWorkspace {...testProps} />);

    await user.type(screen.getByRole('textbox', { name: /company name/i }), 'Ethio Telecom');
    setDate(/contract start date/i, '2026-06-01');
    setDate(/contract end date/i, '2026-05-31');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(await screen.findByText(/contract end date cannot be before the start date/i)).toBeInTheDocument();
    expect(mockSaveCreditCompany).not.toHaveBeenCalled();
  });

  test('edits an existing company, showing its values unescaped and keeping its contract dates', async () => {
    const user = userEvent.setup();
    const company = {
      uuid: 'company-uuid',
      display: 'Smith &amp; Sons',
      name: 'Smith &amp; Sons',
      retired: false,
      contractStartDate: '2026-01-01T00:00:00.000+0300',
      contractEndDate: '2026-12-31T00:00:00.000+0300',
    } as Organization;
    render(<CreditCompanyWorkspace {...testProps} initialCreditCompany={company} />);

    const nameInput = screen.getByRole('textbox', { name: /company name/i });
    expect(nameInput).toHaveValue('Smith & Sons');

    await user.type(nameInput, ' PLC');
    await user.click(screen.getByRole('button', { name: /save & close/i }));

    expect(mockSaveCreditCompany).toHaveBeenCalledWith(
      { ...emptyPayload, name: 'Smith & Sons PLC', contractStartDate: '2026-01-01', contractEndDate: '2026-12-31' },
      'company-uuid',
    );
  });

  test('shows the server message when saving fails', async () => {
    const user = userEvent.setup();
    mockSaveCreditCompany.mockRejectedValue({
      responseBody: { error: { translatedMessage: "A credit company named 'Ethio Telecom' already exists" } },
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
