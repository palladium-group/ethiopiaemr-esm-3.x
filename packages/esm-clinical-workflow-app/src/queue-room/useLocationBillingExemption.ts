import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useSession, type FetchResponse } from '@openmrs/esm-framework';

export const EXEMPTIONS_GLOBAL_PROPERTY = 'kenyaemr.billing.exemptions';
export const exemptionsSettingUrl = `${restBaseUrl}/systemsetting?q=${EXEMPTIONS_GLOBAL_PROPERTY}&v=custom:(uuid,property,value)`;

interface SystemSetting {
  uuid: string;
  property: string;
  value: string | null;
}

export interface LocationReference {
  uuid?: string;
  name?: string;
  display?: string;
}

export function unescapeHtml(value: string): string {
  let current = value;
  let previous: string;
  do {
    previous = current;
    current = previous
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  } while (current !== previous);
  return current;
}

/**
 * Extracts location names that have all services exempted from the kenyaemr.billing.exemptions JSON.
 * Rules matching 'Patients seen at location' and 'exempt all services' are stored under `services`
 * as keys formatted like `location:<Location Name>:all`.
 */
export function extractExemptLocationNames(exemptionsJsonString: string | null | undefined): string[] {
  if (!exemptionsJsonString?.trim()) {
    return [];
  }
  try {
    const services = JSON.parse(exemptionsJsonString)?.services;
    if (!services || typeof services !== 'object') {
      return [];
    }
    return Object.keys(services)
      .map((k) =>
        unescapeHtml(k)
          .trim()
          .match(/^location\s*:\s*(.+?)\s*:\s*all$/i)?.[1]
          ?.trim(),
      )
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

export function isLocationMatchingExemptions(exemptLocations: string[], location?: LocationReference | null): boolean {
  if (!location || !exemptLocations.length) {
    return false;
  }
  const ids = [location.name, location.display, location.uuid].filter(Boolean).map((s) => s!.trim().toLowerCase());
  return exemptLocations.some((loc) => ids.includes(loc.trim().toLowerCase()));
}

/**
 * Hook to determine if the current login location (or target queue location) has an exemption
 * for all services configured under `kenyaemr.billing.exemptions`.
 */
export function useLocationBillingExemption(targetLocation?: LocationReference | null) {
  const { sessionLocation } = useSession();

  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<SystemSetting> }>>(
    exemptionsSettingUrl,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  const exemptLocationNames = useMemo(() => {
    const setting = data?.data?.results?.find((s) => s.property === EXEMPTIONS_GLOBAL_PROPERTY);
    return extractExemptLocationNames(setting?.value);
  }, [data?.data?.results]);

  const isLocationExempted = useMemo(() => {
    return (
      isLocationMatchingExemptions(exemptLocationNames, sessionLocation) ||
      isLocationMatchingExemptions(exemptLocationNames, targetLocation)
    );
  }, [exemptLocationNames, sessionLocation, targetLocation]);

  return {
    isLocationExempted,
    exemptLocationNames,
    isLoading,
    error,
  };
}
