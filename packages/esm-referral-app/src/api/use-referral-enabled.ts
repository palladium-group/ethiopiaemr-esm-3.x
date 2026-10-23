import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, type OpenmrsResource } from '@openmrs/esm-framework';

/** Must match EthiopiaEmrReferralConstants.GP_REFERRAL_ENABLED */
export const REFERRAL_ENABLED_PROPERTY = 'ethiopiaemrreferral.referralEnabled';

/**
 * Whether the referral feature is switched on in this environment.
 * Defaults to disabled while loading and on error.
 */
export function useReferralEnabled() {
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }>(
    `/ws/rest/v1/systemsetting?q=${REFERRAL_ENABLED_PROPERTY}&v=custom:(property,value)`,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const setting = data?.data?.results?.find((result) => result.property === REFERRAL_ENABLED_PROPERTY);

  return {
    isReferralEnabled: typeof setting?.value === 'string' && setting.value.trim().toLowerCase() === 'true',
    isLoading,
    error,
  };
}
