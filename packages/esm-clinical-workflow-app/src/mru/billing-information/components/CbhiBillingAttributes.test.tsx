import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useCbhiManualEntrySetting } from '../hooks/useCbhiManualEntrySetting';
import { CbhiBillingAttributes } from './CbhiBillingAttributes';
import { CBHI_ATTRIBUTE_UUIDS } from '../billing-constants';

jest.mock('../hooks/useCbhiManualEntrySetting', () => ({
  useCbhiManualEntrySetting: jest.fn(),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn(),
  openmrsFetch: jest.fn(),
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
const mockedOpenmrsFetch = openmrsFetch as jest.Mock;

describe('CbhiBillingAttributes', () => {
  const t = (key: string, defaultMessage?: string) => defaultMessage || key;
  const setValueMock = jest.fn();

  const renderWithFreshCache = (ui: React.ReactElement) =>
    render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOpenmrsFetch.mockResolvedValue({ data: [] });
  });

  it('renders online member search when allowCbhiManualEntry is false', () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: false });

    renderWithFreshCache(<CbhiBillingAttributes errors={{}} t={t as any} attributes={{}} setValue={setValueMock} />);

    expect(screen.getByTestId('cbhi-member-search')).toBeInTheDocument();
    expect(screen.queryByLabelText(/CBHI ID/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Expiry Date/)).not.toBeInTheDocument();
  });

  it('renders manual entry fields (CBHI ID and Expiry Date) when allowCbhiManualEntry is true', async () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: true });

    renderWithFreshCache(
      <CbhiBillingAttributes
        errors={{}}
        t={t as any}
        attributes={{
          cbhiId: 'CBHI-5555',
          expiryDate: '2026-10-15',
        }}
        setValue={setValueMock}
      />,
    );

    await waitFor(() =>
      expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
        '/module/addresshierarchy/ajax/getChildAddressHierarchyEntries.form?searchString=',
      ),
    );

    // Search should not be rendered
    expect(screen.queryByTestId('cbhi-member-search')).not.toBeInTheDocument();

    // CBHI ID text input
    const cbhiIdInput = screen.getByLabelText(/CBHI ID/) as HTMLInputElement;
    expect(cbhiIdInput).toBeInTheDocument();
    expect(cbhiIdInput.value).toBe('CBHI-5555');

    // Expiry Date input
    const expiryDateInput = screen.getByLabelText(/Expiry Date/) as HTMLInputElement;
    expect(expiryDateInput).toBeInTheDocument();
    expect(expiryDateInput.value).toBe('2026-10-15');

    // Test typing in CBHI ID
    fireEvent.change(cbhiIdInput, { target: { value: 'CBHI-7777' } });
    expect(setValueMock).toHaveBeenCalledWith(
      'attributes',
      expect.objectContaining({
        cbhiId: 'CBHI-7777',
        [CBHI_ATTRIBUTE_UUIDS.cbhiId]: 'CBHI-7777',
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
        [CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate]: '2027-12-31',
      }),
      { shouldDirty: true },
    );
  });

  it('preserves pre-populated Region, Zone, and Woreda in edit mode while hierarchy entries load', () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: true });
    mockedOpenmrsFetch.mockReturnValue(new Promise(() => {}));

    renderWithFreshCache(
      <CbhiBillingAttributes
        errors={{}}
        t={t as any}
        attributes={{
          cbhiRegion: 'Oromia',
          cbhiZone: 'Jimma',
          cbhiWoreda: 'Kersa',
        }}
        setValue={setValueMock}
      />,
    );

    expect((screen.getByLabelText(/CBHI Region/) as HTMLInputElement).value).toBe('Oromia');
    expect((screen.getByLabelText(/CBHI Zone/) as HTMLInputElement).value).toBe('Jimma');
    expect((screen.getByLabelText(/CBHI Woreda/) as HTMLInputElement).value).toBe('Kersa');
    expect(setValueMock).not.toHaveBeenCalled();
  });

  it('supports cascading Region -> Zone -> Woreda dropdown selection and resets child levels on parent change', async () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: true });
    mockedOpenmrsFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('searchString=')) {
        return { data: [{ name: 'Oromia' }, { name: 'Amhara' }] };
      }
      if (url.endsWith('searchString=Oromia')) {
        return { data: [{ name: 'Jimma' }, { name: 'Bale' }] };
      }
      if (url.endsWith(`searchString=${encodeURIComponent('Oromia|Jimma')}`)) {
        return { data: [{ name: 'Kersa' }, { name: 'Mana' }] };
      }
      if (url.endsWith('searchString=Amhara')) {
        return { data: [{ name: 'North Gondar' }] };
      }
      return { data: [] };
    });

    function Harness() {
      const [attributes, setAttributes] = useState<Record<string, any>>({});
      return (
        <CbhiBillingAttributes
          errors={{}}
          t={t as any}
          attributes={attributes}
          setValue={(_, nextValue) => {
            setValueMock(nextValue);
            setAttributes(nextValue);
          }}
        />
      );
    }

    renderWithFreshCache(<Harness />);

    const regionInput = screen.getByLabelText(/CBHI Region/) as HTMLInputElement;
    const zoneInput = screen.getByLabelText(/CBHI Zone/) as HTMLInputElement;
    const woredaInput = screen.getByLabelText(/CBHI Woreda/) as HTMLInputElement;

    expect(zoneInput).toBeDisabled();
    expect(woredaInput).toBeDisabled();

    fireEvent.focus(regionInput);
    const oromiaOption = await screen.findByRole('option', { name: 'Oromia' });
    fireEvent.click(oromiaOption);

    expect(regionInput.value).toBe('Oromia');
    await waitFor(() => expect(zoneInput).not.toBeDisabled());
    expect(woredaInput).toBeDisabled();

    fireEvent.focus(zoneInput);
    const jimmaOption = await screen.findByRole('option', { name: 'Jimma' });
    fireEvent.click(jimmaOption);

    expect(zoneInput.value).toBe('Jimma');
    await waitFor(() => expect(woredaInput).not.toBeDisabled());

    fireEvent.focus(woredaInput);
    const kersaOption = await screen.findByRole('option', { name: 'Kersa' });
    fireEvent.click(kersaOption);

    expect(woredaInput.value).toBe('Kersa');
    expect(setValueMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cbhiRegion: 'Oromia',
        cbhiZone: 'Jimma',
        cbhiWoreda: 'Kersa',
        [CBHI_ATTRIBUTE_UUIDS.cbhiRegion]: 'Oromia',
        [CBHI_ATTRIBUTE_UUIDS.cbhiZone]: 'Jimma',
        [CBHI_ATTRIBUTE_UUIDS.cbhiWoreda]: 'Kersa',
      }),
    );

    // Changing Region resets Zone and Woreda
    fireEvent.change(regionInput, { target: { value: '' } });
    fireEvent.focus(regionInput);
    const amharaOption = await screen.findByRole('option', { name: 'Amhara' });
    fireEvent.click(amharaOption);

    expect(regionInput.value).toBe('Amhara');
    expect(zoneInput.value).toBe('');
    expect(woredaInput.value).toBe('');
    expect(woredaInput).toBeDisabled();

    fireEvent.focus(zoneInput);
    expect(await screen.findByRole('option', { name: 'North Gondar' })).toBeInTheDocument();
  });

  it('clears non-matching typed text when closing the dropdown', async () => {
    mockedUseCbhiManualEntrySetting.mockReturnValue({ isManualEntryEnabled: true });
    mockedOpenmrsFetch.mockResolvedValue({ data: [{ name: 'Oromia' }] });

    function Harness() {
      const [attributes, setAttributes] = useState<Record<string, any>>({});
      return (
        <CbhiBillingAttributes
          errors={{}}
          t={t as any}
          attributes={attributes}
          setValue={(_, nextValue) => setAttributes(nextValue)}
        />
      );
    }

    renderWithFreshCache(<Harness />);

    const regionInput = screen.getByLabelText(/CBHI Region/) as HTMLInputElement;
    await waitFor(() =>
      expect(mockedOpenmrsFetch).toHaveBeenCalledWith(
        '/module/addresshierarchy/ajax/getChildAddressHierarchyEntries.form?searchString=',
      ),
    );

    fireEvent.change(regionInput, { target: { value: 'Invalid Region' } });
    expect(regionInput.value).toBe('Invalid Region');

    fireEvent.keyDown(regionInput, { key: 'Escape' });
    await waitFor(() => expect(regionInput.value).toBe(''));
  });
});
