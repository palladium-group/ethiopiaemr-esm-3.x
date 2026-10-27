import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type CreditCompany } from '../../types';
import RetireCreditCompanyModal from './retire-credit-company.modal';
import { retireCreditCompany } from './credit-company.resource';

const mockRetireCreditCompany = jest.mocked(retireCreditCompany);

jest.mock('./credit-company.resource', () => ({
  retireCreditCompany: jest.fn(),
  getErrorMessage: jest.requireActual('./credit-company.resource').getErrorMessage,
  mutateCreditCompanies: jest.fn(),
}));

const company = {
  uuid: 'company-uuid',
  display: 'Ethio Telecom',
  name: 'Ethio Telecom',
  retired: false,
} as CreditCompany;

describe('RetireCreditCompanyModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retires the company with the entered reason', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    mockRetireCreditCompany.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof retireCreditCompany>>);
    render(<RetireCreditCompanyModal closeModal={closeModal} creditCompany={company} />);

    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Contract ended');
    await user.click(screen.getByRole('button', { name: /retire$/i }));

    expect(mockRetireCreditCompany).toHaveBeenCalledWith('company-uuid', 'Contract ended');
    expect(closeModal).toHaveBeenCalled();
  });

  test('uses a default reason when none is entered', async () => {
    const user = userEvent.setup();
    mockRetireCreditCompany.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof retireCreditCompany>>);
    render(<RetireCreditCompanyModal closeModal={jest.fn()} creditCompany={company} />);

    await user.click(screen.getByRole('button', { name: /retire$/i }));

    expect(mockRetireCreditCompany).toHaveBeenCalledWith('company-uuid', 'Retired from billing admin');
  });

  test('does not retire when cancelled', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    render(<RetireCreditCompanyModal closeModal={closeModal} creditCompany={company} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(closeModal).toHaveBeenCalled();
    expect(mockRetireCreditCompany).not.toHaveBeenCalled();
  });
});
