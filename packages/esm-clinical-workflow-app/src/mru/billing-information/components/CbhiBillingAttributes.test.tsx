import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useCbhiManualEntrySetting } from '../hooks/useCbhiManualEntrySetting';
import { CbhiBillingAttributes } from './CbhiBillingAttributes';

jest.mock('../hooks/useCbhiManualEntrySetting', () => ({
  useCbhiManualEntrySetting: jest.fn(),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn(),
  OpenmrsDatePicker: ({ id, labelText, value, onChange }: any) => (
    <div>
      <label htmlFor={id}>{labelText}</label>
      <input id={id} data-testid="mock-date-picker" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
}));

jest.mock('./CbhiMemberSearch', () => ({
  CbhiMemberSearch: () => <div data-testid="cbhi-member-search">Mock CbhiMemberSearch</div>,
}));

const mockedUseCbhiManualEntrySetting = useCbhiManualEntrySetting as jest.Mock;

describe('CbhiBillingAttributes', () => {
  const t = (key: string, defaultMessage?: string) => defaultMessage || key;
  const setValueMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders online member search when allowCbhiManualEntry is false', () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: false });

    render(
      <CbhiBillingAttributes
        control={{} as any}
        errors={{}}
        t={t as any}
        attributeTypes={[]}
        attributes={{}}
        setValue={setValueMock}
      />,
    );

    expect(screen.getByTestId('cbhi-member-search')).toBeInTheDocument();
    expect(screen.queryByLabelText('CBHI ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Expiry Date')).not.toBeInTheDocument();
  });

  it('renders manual entry fields (CBHI ID and Expiry Date) when allowCbhiManualEntry is true', () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: true });

    render(
      <CbhiBillingAttributes
        control={{} as any}
        errors={{}}
        t={t as any}
        attributeTypes={[
          { uuid: 'cbhi-attr-type-uuid', name: 'CBHI ID' },
          { uuid: 'expiry-attr-type-uuid', name: 'Expiry Date' },
        ]}
        attributes={{
          cbhiId: 'CBHI-5555',
          expiryDate: '2026-10-15',
        }}
        setValue={setValueMock}
      />,
    );

    // Search should not be rendered
    expect(screen.queryByTestId('cbhi-member-search')).not.toBeInTheDocument();

    // CBHI ID text input
    const cbhiIdInput = screen.getByLabelText('CBHI ID') as HTMLInputElement;
    expect(cbhiIdInput).toBeInTheDocument();
    expect(cbhiIdInput.value).toBe('CBHI-5555');

    // Expiry Date input
    const expiryDateInput = screen.getByLabelText('Expiry Date') as HTMLInputElement;
    expect(expiryDateInput).toBeInTheDocument();
    expect(expiryDateInput.value).toBe('2026-10-15');

    // Test typing in CBHI ID
    fireEvent.change(cbhiIdInput, { target: { value: 'CBHI-7777' } });
    expect(setValueMock).toHaveBeenCalledWith(
      'attributes',
      expect.objectContaining({
        cbhiId: 'CBHI-7777',
        'cbhi-attr-type-uuid': 'CBHI-7777',
      }),
      { shouldDirty: true },
    );

    // Test changing Expiry Date
    fireEvent.change(expiryDateInput, { target: { value: '2027-12-31' } });
    expect(setValueMock).toHaveBeenCalledWith(
      'attributes',
      expect.objectContaining({
        expiryDate: '2027-12-31',
        cbhiExpiryDate: '2027-12-31',
        'expiry-attr-type-uuid': '2027-12-31',
      }),
      { shouldDirty: true },
    );
  });
});
