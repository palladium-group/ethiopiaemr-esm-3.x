import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { renderHook, waitFor } from '@testing-library/react';
import { clearUsernameChecks, isUsernameTaken, useAdminUsers } from './user-list.resource';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

describe('isUsernameTaken', () => {
  beforeEach(() => {
    clearUsernameChecks();
    mockOpenmrsFetch.mockReset();
  });

  it('looks the username up on the server and caches the answer', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [{ uuid: 'user-1' }] } } as never);

    await expect(isUsernameTaken('admin')).resolves.toBe(true);
    await expect(isUsernameTaken(' admin ')).resolves.toBe(true);

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/user?username=admin&v=custom:(uuid)`);
  });

  it('reports a free username and does not block the form when the lookup fails', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: [] } } as never);
    await expect(isUsernameTaken('newuser')).resolves.toBe(false);

    mockOpenmrsFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(isUsernameTaken('other')).resolves.toBe(false);
  });
});

describe('useAdminUsers', () => {
  const types = { licenseNumber: 'license-type', licenseExpiry: 'expiry-type', nationalId: 'national-id-type' };

  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [], totalCount: 0 } } as never);
  });

  it('requests one server page, passing license attribute types only for license filters', async () => {
    const { rerender } = renderHook((props: Parameters<typeof useAdminUsers>[0]) => useAdminUsers(props), {
      initialProps: { searchTerm: ' abebe ', page: 3, pageSize: 20, licenseAttributeTypes: types },
    });
    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalled());
    const allUrl = new URL(mockOpenmrsFetch.mock.calls[0][0] as string, 'http://x');
    expect(allUrl.pathname).toBe(`${restBaseUrl}/ethiopiaemrcustommodule/adminuser`);
    expect(Object.fromEntries(allUrl.searchParams)).toEqual({
      startIndex: '40',
      limit: '20',
      licenseStatus: 'allUsers',
      q: 'abebe',
    });

    rerender({ licenseStatus: 'unlicensed', page: 1, pageSize: 10, licenseAttributeTypes: types });
    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalledTimes(2));
    const filteredUrl = new URL(mockOpenmrsFetch.mock.calls[1][0] as string, 'http://x');
    expect(Object.fromEntries(filteredUrl.searchParams)).toEqual({
      startIndex: '0',
      limit: '10',
      licenseStatus: 'unlicensed',
      licenseNumberAttributeType: 'license-type',
      licenseExpiryAttributeType: 'expiry-type',
      nationalIdAttributeType: 'national-id-type',
    });
  });
});
