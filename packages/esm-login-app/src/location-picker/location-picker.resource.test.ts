import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch, useSession, type FetchResponse } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import { mockLoginLocations, mockResolvedLoginLocationsResponse } from '../../__mocks__/locations.mock';
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

  it('uses the backend-resolved per-user endpoint when restrictByUser is true', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResolvedLoginLocationsResponse as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrls = mockOpenmrsFetch.mock.calls.map((call) => call[0] as string);
    // no uuid in the path, and the GET_USERS-gated /user/{uuid}/location is never called
    expect(calledUrls).toContain('/ws/rest/v1/userlocation/loginlocation');
    expect(calledUrls.some((url) => url.includes('/user/'))).toBe(false);
    // the backend already resolved the list; the hook renders it verbatim
    expect(result.current.locations).toEqual([
      { uuid: '44c3efb0-2583-4c80-a79e-1f756a03c0a1', name: 'Outpatient Clinic' },
      { uuid: 'ba685651-ed3b-4e63-9b35-78893060758a', name: 'Inpatient Ward' },
    ]);
  });

  it('does not call the FHIR tagged-location search when restrictByUser is true', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockResolvedLoginLocationsResponse as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrls = mockOpenmrsFetch.mock.calls.map((call) => call[0] as string);
    expect(calledUrls.some((url) => url.includes('/ws/fhir2/'))).toBe(false);
  });

  it('leaves locations undefined and surfaces the error when the fetch fails', async () => {
    // `undefined` rather than `[]` is what lets callers tell "this user has no login locations"
    // apart from "we couldn't find out". Returning [] here is what used to log users in with no
    // session location at all.
    mockOpenmrsFetch.mockRejectedValue({ response: { status: 403 } });

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.locations).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('retries a server error and resolves once it succeeds', async () => {
    mockOpenmrsFetch
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValue(mockResolvedLoginLocationsResponse as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(
      () => {
        expect(result.current.locations).toHaveLength(2);
      },
      { timeout: 15000 },
    );
    expect(mockOpenmrsFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('refetches when mutate is called', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce({ response: { status: 403 } });

    const { result } = renderHook(() => useLoginLocations(true), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    mockOpenmrsFetch.mockResolvedValue(mockResolvedLoginLocationsResponse as FetchResponse<any>);
    await result.current.mutate();

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(2);
    });
    expect(result.current.error).toBeUndefined();
  });

  it('uses the unfiltered FHIR search when restrictByUser is false', async () => {
    mockOpenmrsFetch.mockResolvedValue(mockLoginLocations as FetchResponse<any>);

    const { result } = renderHook(() => useLoginLocations(false), { wrapper });

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(4);
    });

    const calledUrls = mockOpenmrsFetch.mock.calls.map((call) => call[0] as string);
    expect(calledUrls.every((url) => url.includes('/ws/fhir2/R4/Location'))).toBe(true);
    expect(calledUrls.some((url) => url.includes('/userlocation/'))).toBe(false);
    expect(result.current.locations[0]).toEqual({
      uuid: mockLoginLocations.data.entry[0].resource.id,
      name: mockLoginLocations.data.entry[0].resource.name,
    });
  });
});
