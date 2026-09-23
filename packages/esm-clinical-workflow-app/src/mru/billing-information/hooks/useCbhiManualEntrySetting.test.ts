import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useConfig } from '@openmrs/esm-framework';
import { useCbhiManualEntrySetting, GP_ALLOW_CBHI_MANUAL_ENTRY } from './useCbhiManualEntrySetting';

jest.mock('swr');
jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  useConfig: jest.fn(),
}));

const mockedUseSWR = useSWR as jest.Mock;
const mockedUseConfig = useConfig as jest.Mock;

describe('useCbhiManualEntrySetting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses system setting value when present (true)', () => {
    mockedUseConfig.mockReturnValue({ allowCbhiManualEntry: false });
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'setting-uuid-1',
              property: GP_ALLOW_CBHI_MANUAL_ENTRY,
              value: 'true',
            },
          ],
        },
      },
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useCbhiManualEntrySetting());
    expect(result.current.isManualEntryEnabled).toBe(true);
    expect(result.current.settingUuid).toBe('setting-uuid-1');
  });

  it('uses system setting value when present (false)', () => {
    mockedUseConfig.mockReturnValue({ allowCbhiManualEntry: true });
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'setting-uuid-2',
              property: GP_ALLOW_CBHI_MANUAL_ENTRY,
              value: 'false',
            },
          ],
        },
      },
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useCbhiManualEntrySetting());
    expect(result.current.isManualEntryEnabled).toBe(false);
  });

  it('falls back to frontend config when system setting is unset', () => {
    mockedUseConfig.mockReturnValue({ allowCbhiManualEntry: true });
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          results: [],
        },
      },
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useCbhiManualEntrySetting());
    expect(result.current.isManualEntryEnabled).toBe(true);
  });
});
