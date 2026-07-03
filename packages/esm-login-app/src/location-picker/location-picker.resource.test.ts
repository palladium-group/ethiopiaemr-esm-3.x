import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch, useSession, type FetchResponse } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import {
  mockEmptyUserLoginLocationsResponse,
  mockLoginLocations,
  mockUserLoginLocationsResponse,
} from '../../__mocks__/locations.mock';
import { useLoginLocations } from './location-picker.resource';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseSession = jest.mocked(useSession);

// Provide a fresh SWR cache for every test so results are never served from a
// previous test's cache. Required because useSwrImmutable caches by URL key.
const wrapper = ({ children }) => React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('useLoginLocations', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ authenticated: true, user: { uuid: 'user-uuid-1' } } as any);
  });

  it('calls the per-user REST endpoint with the user uuid when restrictByUser is true', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockUserLoginLocationsResponse as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = mockOpenmrsFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/ws/rest/v1/user/user-uuid-1/location');
    expect(calledUrl).toContain('tag=Login+Location');
  });

  it('maps REST results to {uuid, name} when restrictByUser is true', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockUserLoginLocationsResponse as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(2);
    });

    expect(result.current.locations[0]).toEqual({
      uuid: '44c3efb0-2583-4c80-a79e-1f756a03c0a1',
      name: 'Outpatient Clinic',
    });
  });

  it('returns an empty list when the user has no allowed locations', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockEmptyUserLoginLocationsResponse as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.locations).toEqual([]);
  });

  it('falls back to the unfiltered FHIR search when restrictByUser is false', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockLoginLocations as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(false), { wrapper });

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(4);
    });

    const calledUrl = mockOpenmrsFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/ws/fhir2/R4/Location');
    expect(calledUrl).toContain('_tag=Login+Location');
    expect(result.current.locations[0]).toEqual({
      uuid: mockLoginLocations.data.entry[0].resource.id,
      name: mockLoginLocations.data.entry[0].resource.name,
    });
  });

  it('does not call the per-user endpoint before the session user uuid is known', () => {
    mockUseSession.mockReturnValue({ authenticated: true, user: undefined } as any);

    renderHook(() => useLoginLocations(true), { wrapper });

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });
});
