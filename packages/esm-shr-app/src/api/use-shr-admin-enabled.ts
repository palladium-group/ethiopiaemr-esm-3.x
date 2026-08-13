import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, type OpenmrsResource } from '@openmrs/esm-framework';

/**
 * Global property in ethiopiaemr-module-shr acting as the master switch for the SHR administration
 * feature. Must match EthiopiaEmrShrConstants.GP_SHR_ADMIN_ENABLED.
 */
export const SHR_ADMIN_ENABLED_PROPERTY = 'ethiopiaemrshr.shrAdminEnabled';

/**
 * Whether the SHR administration feature is switched on in this environment.
 *
 * This is a feature flag, not an access check — it answers "is this feature live here", while the
 * 'Manage SHR Outbox' privilege answers "may this user use it". Both have to hold. Reading it from a
 * global property rather than browser storage means one setting governs every user on the server,
 * and it can be changed without a redeploy.
 *
 * The server enforces the same property on every outbox endpoint, so hiding the UI is a courtesy to
 * the user rather than the security boundary; a caller who ignores it still gets refused.
 *
 * Defaults to disabled while loading and on error, matching the module's own default. Failing open
 * would flash a screen that every subsequent request then refuses.
 */
export function useShrAdminEnabled() {
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }>(
    `/ws/rest/v1/systemsetting?q=${SHR_ADMIN_ENABLED_PROPERTY}&v=custom:(property,value)`,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    isShrAdminEnabled: readShrAdminEnabled(data?.data?.results),
    isLoading,
    error,
  };
}

/**
 * Reads the flag out of a systemsetting response.
 *
 * Only the exact string "true" enables the feature: the query is a search, so it can match
 * neighbouring properties, and a missing, blank or misspelled value must leave the feature off
 * rather than guess. Mirrors Boolean.parseBoolean on the server, which treats everything that is not
 * "true" as false.
 */
export function readShrAdminEnabled(results: Array<OpenmrsResource> | undefined): boolean {
  const setting = results?.find((result) => result.property === SHR_ADMIN_ENABLED_PROPERTY);
  return typeof setting?.value === 'string' && setting.value.trim().toLowerCase() === 'true';
}
