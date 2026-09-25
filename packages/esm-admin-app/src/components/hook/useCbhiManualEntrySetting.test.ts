import { renderHook, act } from '@testing-library/react';
import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import {
  useCbhiManualEntrySetting,
  saveCbhiManualEntrySetting,
  GP_ALLOW_CBHI_MANUAL_ENTRY,
} from './useCbhiManualEntrySetting';

jest.mock('swr');
jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
}));

const mockedUseSWR = useSWR as jest.Mock;
const mockedOpenmrsFetch = openmrsFetch as jest.Mock;

describe('esm-admin-app: useCbhiManualEntrySetting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads true when system setting is "true"', () => {
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'cbhi-gp-uuid',
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
    expect(result.current.settingUuid).toBe('cbhi-gp-uuid');
  });

  it('reads false when system setting is "false" or missing', () => {
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
    expect(result.current.isManualEntryEnabled).toBe(false);
    expect(result.current.settingUuid).toBeUndefined();
  });

  it('saveCbhiManualEntrySetting calls update endpoint when uuid is provided', async () => {
    mockedOpenmrsFetch.mockResolvedValue({ status: 200 });

    await saveCbhiManualEntrySetting(true, 'existing-uuid-123');

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/systemsetting/existing-uuid-123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { value: 'true' },
    });
  });

  it('saveCbhiManualEntrySetting creates setting when uuid is not provided', async () => {
    mockedOpenmrsFetch.mockResolvedValue({ status: 200 });

    await saveCbhiManualEntrySetting(false);

    expect(mockedOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/systemsetting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        property: GP_ALLOW_CBHI_MANUAL_ENTRY,
        value: 'false',
      },
    });
  });
});
