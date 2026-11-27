import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useCreditCompanies } from './useCreditCompanies';
import { CREDIT_ORGANIZATION_TYPE_UUID } from '../billing-constants';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

jest.mock('swr', () => jest.fn());

describe('useCreditCompanies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries organization endpoint with credit organization type uuid', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderHook(() => useCreditCompanies(true));

    expect(useSWR).toHaveBeenCalledWith(
      `/ws/rest/v1/organization?type=${CREDIT_ORGANIZATION_TYPE_UUID}&v=full`,
      expect.any(Function),
    );
  });

  it('maps credit companies correctly and excludes retired ones', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: '521ee5c6-b537-42c8-915e-1cf151919d63',
              name: 'Ethio Telecom',
              display: 'Ethio Telecom',
              contractNumber: 'CR-2026-014',
              retired: false,
            },
            {
              uuid: 'old-company-uuid',
              name: 'Old Co',
              display: 'Old Co',
              contractNumber: 'CR-OLD',
              retired: true,
            },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useCreditCompanies(true));

    expect(result.current.creditCompanies).toHaveLength(1);
    expect(result.current.creditCompanies[0]).toEqual({
      uuid: '521ee5c6-b537-42c8-915e-1cf151919d63',
      id: 'CR-2026-014',
      name: 'Ethio Telecom',
    });
  });

  it('does not fetch when enabled is false', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderHook(() => useCreditCompanies(false));

    expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });
});
