import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type UserResponse, type ProviderResponse } from '../../../../types';
import useSWR, { mutate } from 'swr';

export type LicenseFilter = 'allUsers' | 'activeLicensed' | 'expiredLicensed' | 'licensedExpiringSoon' | 'unlicensed';

/** A user as returned by the admin user endpoint: the usual user fields plus its provider account, if any. */
export type AdminUser = UserResponse & { provider: ProviderResponse | null };

interface UseAdminUsersParams {
  searchTerm?: string;
  licenseStatus?: LicenseFilter;
  page?: number;
  pageSize?: number;
  licenseAttributeTypes: {
    licenseNumber: string;
    licenseExpiry: string;
    nationalId: string;
  };
}

/**
 * One server-side page of users with their provider accounts, searched (name, username, system id) and
 * filtered by provider license status on the server (ethiopiaemr custom module).
 */
export const useAdminUsers = ({
  searchTerm = '',
  licenseStatus = 'allUsers',
  page = 1,
  pageSize = 10,
  licenseAttributeTypes,
}: UseAdminUsersParams) => {
  const params = new URLSearchParams({
    startIndex: String((page - 1) * pageSize),
    limit: String(pageSize),
    licenseStatus,
  });
  if (searchTerm.trim()) {
    params.set('q', searchTerm.trim());
  }
  if (licenseStatus !== 'allUsers') {
    params.set('licenseNumberAttributeType', licenseAttributeTypes.licenseNumber ?? '');
    params.set('licenseExpiryAttributeType', licenseAttributeTypes.licenseExpiry ?? '');
    params.set('nationalIdAttributeType', licenseAttributeTypes.nationalId ?? '');
  }
  const url = `${restBaseUrl}/ethiopiaemrcustommodule/adminuser?${params.toString()}`;

  const { data, isLoading, isValidating, error, mutate } = useSWR<
    FetchResponse<{ results: Array<AdminUser>; totalCount: number }>
  >(url, openmrsFetch, { keepPreviousData: true, errorRetryCount: 2 });

  return {
    users: data?.data?.results ?? [],
    totalCount: data?.data?.totalCount ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

export const revalidateAdminUsers = () =>
  mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/ethiopiaemrcustommodule/adminuser`));

const usernameChecks = new Map<string, Promise<boolean>>();

/** True when another account already uses this username. Results are cached per workspace session. */
export const isUsernameTaken = (username: string) => {
  const key = username.trim();
  if (!usernameChecks.has(key)) {
    usernameChecks.set(
      key,
      openmrsFetch<{ results: Array<{ uuid: string }> }>(
        `${restBaseUrl}/user?username=${encodeURIComponent(key)}&v=custom:(uuid)`,
      )
        .then((response) => (response?.data?.results?.length ?? 0) > 0)
        .catch(() => {
          // Let the server decide on submit rather than blocking the form on a failed lookup.
          usernameChecks.delete(key);
          return false;
        }),
    );
  }
  return usernameChecks.get(key);
};

export const clearUsernameChecks = () => usernameChecks.clear();
