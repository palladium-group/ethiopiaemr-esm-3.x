import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useConfig, useSession } from '@openmrs/esm-framework';
import { useTriageActiveVisits } from './use-triage-active-visits';
import { buildTriageActiveVisitsUrl } from './triage.resource';

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({ data: undefined, error: undefined, isLoading: false })),
}));

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
  useConfig: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('./triage.resource', () => ({
  buildTriageActiveVisitsUrl: jest.fn(() => '/openmrs/ws/rest/v1/ethiopiaemrcustommodule/visit?attributeValue=adult'),
}));

const mockedUseSWR = useSWR as jest.Mock;
const mockedUseConfig = useConfig as jest.Mock;
const mockedUseSession = useSession as jest.Mock;
const mockedBuildUrl = buildTriageActiveVisitsUrl as jest.Mock;

const ATTRIBUTE_TYPE_UUID = 'c1f592f3-3c6e-44c9-ac2d-ddab90f705ba';

describe('useTriageActiveVisits', () => {
  beforeEach(() => {
    mockedUseSWR.mockClear();
    mockedBuildUrl.mockClear();
    mockedUseConfig.mockReturnValue({ triageVisitAttributeTypeUuid: ATTRIBUTE_TYPE_UUID });
    mockedUseSession.mockReturnValue({ sessionLocation: { uuid: 'location-1' } });
  });

  it('requests visits for the current triage id only', () => {
    renderHook(() => useTriageActiveVisits('adult', { startIndex: 0, limit: 25 }));

    expect(mockedBuildUrl).toHaveBeenCalledWith({
      sessionLocation: 'location-1',
      attributeTypeUuid: ATTRIBUTE_TYPE_UUID,
      triageId: 'adult',
      startIndex: 0,
      limit: 25,
    });
    expect(mockedUseSWR).toHaveBeenCalledWith(
      '/openmrs/ws/rest/v1/ethiopiaemrcustommodule/visit?attributeValue=adult',
      expect.any(Function),
    );
  });

  it('does not fetch when skip is true', () => {
    renderHook(() => useTriageActiveVisits('adult', { skip: true }));

    expect(mockedBuildUrl).not.toHaveBeenCalled();
    expect(mockedUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });
});
