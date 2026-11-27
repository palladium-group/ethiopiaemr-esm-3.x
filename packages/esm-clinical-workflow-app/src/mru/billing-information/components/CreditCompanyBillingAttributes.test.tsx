import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreditCompanyBillingAttributes } from './CreditCompanyBillingAttributes';
import { useCreditCompanies } from '../hooks/useCreditCompanies';
import { CREDIT_COMPANY_ATTRIBUTE_UUIDS } from '../billing-constants';

jest.mock('../hooks/useCreditCompanies', () => ({
  useCreditCompanies: jest.fn(),
}));

const mockT = ((key: string, defaultVal: string) => defaultVal || key) as any;

describe('CreditCompanyBillingAttributes', () => {
  const setValueMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dropdown with credit companies from hook and selects company', () => {
    (useCreditCompanies as jest.Mock).mockReturnValue({
      creditCompanies: [
        {
          uuid: '521ee5c6-b537-42c8-915e-1cf151919d63',
          id: 'CR-2026-014',
          name: 'Ethio Telecom',
        },
      ],
      isLoading: false,
    });

    render(<CreditCompanyBillingAttributes errors={{}} t={mockT} attributes={{}} setValue={setValueMock} />);

    expect(screen.getByText('Company Name *')).toBeInTheDocument();
    expect(screen.getByText('Select Company')).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(screen.getByText('Select Company'));

    // Select Ethio Telecom
    fireEvent.click(screen.getByText('Ethio Telecom'));

    expect(setValueMock).toHaveBeenCalledWith(
      'attributes',
      {
        [CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany]: '521ee5c6-b537-42c8-915e-1cf151919d63',
        creditCompanyId: 'CR-2026-014',
        creditCompanyName: 'Ethio Telecom',
      },
      { shouldDirty: true },
    );
  });
});
