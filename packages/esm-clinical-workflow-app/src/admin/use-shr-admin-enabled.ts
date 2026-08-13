import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, type OpenmrsResource } from '@openmrs/esm-framework';

/**
 * Global property in ethiopiaemr-module-shr acting as the master switch for the SHR administration
 * feature. Must match EthiopiaEmrShrConstants.GP_SHR_ADMIN_ENABLED.
 */
export const SHR_ADMIN_ENABLED_PROPERTY = 'ethiopiaemrshr.shrAdminEnabled';

/**
 * Whether the SHR administration feature is switched on in this environment, used here to decide
 * whether the SHR Admin nav tile is offered at all.
 *
 * Deliberately a local copy of the hook in esm-shr-app rather than a shared import: these packages
 * have no dependency on one another, and adding one to carry a single fetch would couple the whole
 * navbar to the SHR app. The property name is the contract between them.
 *
 * Defaults to disabled while loading and on error, so a slow or failing lookup hides the link rather
 * than offering a page the server will refuse.
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

  // The query is a search, so it can match neighbouring properties; take the exact key rather than
  // the first result. Only the exact string "true" enables the feature, mirroring
  // Boolean.parseBoolean on the server.
  const setting = data?.data?.results?.find((result) => result.property === SHR_ADMIN_ENABLED_PROPERTY);

  return {
    isShrAdminEnabled: typeof setting?.value === 'string' && setting.value.trim().toLowerCase() === 'true',
    isLoading,
    error,
  };
}
