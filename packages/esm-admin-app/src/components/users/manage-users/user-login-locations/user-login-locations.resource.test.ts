import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { saveUserLoginLocations } from './user-login-locations.resource';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);

describe('saveUserLoginLocations', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockClear();
    mockOpenmrsFetch.mockResolvedValue({} as never);
  });

  it('posts additions and deletes removals', async () => {
    await saveUserLoginLocations('user-1', ['a', 'b'], ['b', 'c']);

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(2);
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/user/user-1/location`,
      expect.objectContaining({ method: 'POST', body: { location: 'c' } }),
    );
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/user/user-1/location/a`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('makes no requests when the selection is unchanged', async () => {
    await saveUserLoginLocations('user-1', ['a', 'b'], ['b', 'a']);

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });
});
