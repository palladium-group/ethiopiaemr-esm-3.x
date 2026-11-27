import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useConfig, useSession } from '@openmrs/esm-framework';
import {
  buildScoreboardVisitsUrl,
  useActiveVisits,
  useActiveVisitsCount,
  useTotalVisits,
  useTotalVisitsCount,
} from './useVisitList';

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

const mockedUseSWR = useSWR as jest.Mock;
const mockedUseConfig = useConfig as jest.Mock;
const mockedUseSession = useSession as jest.Mock;

const ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID = 'b8d2e4f1-6c3a-4e9b-a1f7-5d0c8e2b9473';
const SERVICE_LOCATION_UUID = '1710c866-edee-4ca7-82e0-92333c5529d4';

describe('buildScoreboardVisitsUrl', () => {
  it('returns null when sessionLocation is missing', () => {
    const url = buildScoreboardVisitsUrl({
      sessionLocation: undefined,
      shouldFilterByLocation: true,
      assignedQueueAttributeTypeUuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID,
      includeInactive: false,
    });
    expect(url).toBeNull();
  });

  it('targets ethiopiaemrcustommodule/visit and filters by assignedQueue attribute when filtering by location', () => {
    const url = buildScoreboardVisitsUrl({
      sessionLocation: SERVICE_LOCATION_UUID,
      shouldFilterByLocation: true,
      assignedQueueAttributeTypeUuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID,
      includeInactive: false,
      totalCount: true,
      startIndex: 0,
      limit: 25,
    });

    expect(url).toContain('/openmrs/ws/rest/v1/ethiopiaemrcustommodule/visit?');
    expect(url).toContain(`attributeType=${ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID}`);
    expect(url).toContain(`attributeValue=${SERVICE_LOCATION_UUID}`);
    expect(url).not.toContain(`location=${SERVICE_LOCATION_UUID}`);
    expect(url).toContain('includeInactive=false');
    expect(url).toContain('totalCount=true');
    expect(url).toContain('startIndex=0');
    expect(url).toContain('limit=25');
  });

  it('falls back to standard /visit with location when assignedQueueAttributeTypeUuid is not provided', () => {
    const url = buildScoreboardVisitsUrl({
      sessionLocation: SERVICE_LOCATION_UUID,
      shouldFilterByLocation: true,
      assignedQueueAttributeTypeUuid: undefined,
      includeInactive: false,
    });

    expect(url).toContain('/openmrs/ws/rest/v1/visit?');
    expect(url).toContain(`location=${SERVICE_LOCATION_UUID}`);
    expect(url).not.toContain('attributeType=');
  });

  it('targets standard /visit without attribute or location filter when shouldFilterByLocation is false (MRU)', () => {
    const url = buildScoreboardVisitsUrl({
      sessionLocation: SERVICE_LOCATION_UUID,
      shouldFilterByLocation: false,
      assignedQueueAttributeTypeUuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID,
      includeInactive: false,
    });

    expect(url).toContain('/openmrs/ws/rest/v1/visit?');
    expect(url).not.toContain('attributeType=');
    expect(url).not.toContain(`location=${SERVICE_LOCATION_UUID}`);
    expect(url).toContain('limit=500');
  });

  it('includes fromStartDate and custom representation when supplied', () => {
    const url = buildScoreboardVisitsUrl({
      sessionLocation: SERVICE_LOCATION_UUID,
      shouldFilterByLocation: true,
      assignedQueueAttributeTypeUuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID,
      includeInactive: true,
      fromStartDate: '2026-11-05',
      representation: 'custom:(uuid,stopDatetime)',
      limit: 100,
    });

    expect(url).toContain('/openmrs/ws/rest/v1/ethiopiaemrcustommodule/visit?v=custom:(uuid,stopDatetime)&');
    expect(url).toContain('fromStartDate=2026-11-05');
    expect(url).toContain('includeInactive=true');
    expect(url).toContain('limit=100');
  });
});

describe('useVisitList hooks with assigned queue location filtering', () => {
  beforeEach(() => {
    mockedUseSWR.mockClear();
    mockedUseConfig.mockReturnValue({
      assignedQueueVisitAttributeTypeUuid: ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID,
      medicalRecordingUnitLocationTagName: 'MRU',
      medicalRecordingUnitLocationTagUuid: 'mru-tag-uuid',
    });
    mockedUseSession.mockReturnValue({
      sessionLocation: { uuid: SERVICE_LOCATION_UUID },
    });
  });

  it('useActiveVisits queries assigned queue attribute on ethiopiaemrcustommodule/visit', () => {
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          results: [{ uuid: 'visit-1' }],
          totalCount: 1,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useActiveVisits({ startIndex: 0, limit: 25 }));

    expect(result.current.visits).toEqual([{ uuid: 'visit-1' }]);
    expect(result.current.count).toBe(1);

    const calledUrl = mockedUseSWR.mock.calls.find(([url]) => url?.includes('ethiopiaemrcustommodule/visit'))?.[0];
    expect(calledUrl).toBeDefined();
    expect(calledUrl).toContain(`attributeType=${ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID}`);
    expect(calledUrl).toContain(`attributeValue=${SERVICE_LOCATION_UUID}`);
    expect(calledUrl).not.toContain(`location=${SERVICE_LOCATION_UUID}`);
  });

  it('useActiveVisitsCount requests minimal uuid representation with limit=1', () => {
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          totalCount: 12,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useActiveVisitsCount());

    expect(result.current.count).toBe(12);

    const calledUrl = mockedUseSWR.mock.calls.find(([url]) => url?.includes('v=custom:(uuid)'))?.[0];
    expect(calledUrl).toBeDefined();
    expect(calledUrl).toContain(`attributeType=${ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID}`);
    expect(calledUrl).toContain(`attributeValue=${SERVICE_LOCATION_UUID}`);
    expect(calledUrl).toContain('limit=1');
    expect(calledUrl).toContain('totalCount=true');
  });

  it('useTotalVisitsCount counts visits completed today for assigned location', () => {
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          results: [
            { uuid: 'v-1', stopDatetime: '2026-11-05T10:00:00.000Z' },
            { uuid: 'v-2', stopDatetime: null },
            { uuid: 'v-3', stopDatetime: '2026-11-05T11:00:00.000Z' },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useTotalVisitsCount());

    expect(result.current.count).toBe(2);

    const calledUrl = mockedUseSWR.mock.calls.find(([url]) => url?.includes('v=custom:(uuid,stopDatetime)'))?.[0];
    expect(calledUrl).toBeDefined();
    expect(calledUrl).toContain(`attributeType=${ASSIGNED_QUEUE_ATTRIBUTE_TYPE_UUID}`);
    expect(calledUrl).toContain('includeInactive=true');
  });
});
