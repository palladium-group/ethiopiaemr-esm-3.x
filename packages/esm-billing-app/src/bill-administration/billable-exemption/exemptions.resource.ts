import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  EXEMPTIONS_GLOBAL_PROPERTY,
  type ExemptionsConfig,
  emptyConfig,
  parseExemptions,
  serializeExemptions,
} from './exemption-rules.utils';

interface SystemSetting {
  uuid: string;
  property: string;
  value: string | null;
}

export const exemptionsSettingUrl = `${restBaseUrl}/systemsetting?q=${EXEMPTIONS_GLOBAL_PROPERTY}&v=custom:(uuid,property,value)`;

async function fetchExemptionsSetting(): Promise<SystemSetting | undefined> {
  const response = await openmrsFetch<{ results: Array<SystemSetting> }>(exemptionsSettingUrl);
  return response.data?.results?.find((setting) => setting.property === EXEMPTIONS_GLOBAL_PROPERTY);
}

export function useExemptionsSetting() {
  const { data: setting, error, isLoading } = useSWR(exemptionsSettingUrl, fetchExemptionsSetting);

  const { config, parseError } = useMemo(() => {
    try {
      return { config: parseExemptions(setting?.value), parseError: null };
    } catch (e) {
      return { config: emptyConfig(), parseError: e as Error };
    }
  }, [setting?.value]);

  return { config, raw: setting?.value ?? '', settingUuid: setting?.uuid, parseError, error, isLoading };
}

/** Saves the raw global property value, creating the property if it does not exist yet. */
export async function saveExemptionsValue(value: string, settingUuid?: string) {
  if (settingUuid) {
    await openmrsFetch(`${restBaseUrl}/systemsetting/${settingUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { value },
    });
  } else {
    await openmrsFetch(`${restBaseUrl}/systemsetting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { property: EXEMPTIONS_GLOBAL_PROPERTY, value },
    });
  }
  await mutate(exemptionsSettingUrl);
}

/**
 * Applies `change` to the latest saved exemptions and saves the result. Reading the setting
 * again right before saving avoids overwriting changes someone else saved in the meantime.
 */
export async function updateExemptions(change: (config: ExemptionsConfig) => ExemptionsConfig) {
  const setting = await fetchExemptionsSetting();
  const next = change(parseExemptions(setting?.value));
  await saveExemptionsValue(JSON.stringify(serializeExemptions(next), null, 2), setting?.uuid);
}

export interface NamedOption {
  uuid: string;
  name: string;
}

/** Login locations: the session location a user picks at login is what location rules match. */
export function useLoginLocations() {
  const url = `${restBaseUrl}/location?tag=Login%20Location&v=custom:(uuid,name)`;
  const { data, error, isLoading } = useSWR<{ data: { results: Array<NamedOption> } }>(url, openmrsFetch);
  return { locations: data?.data?.results ?? [], error, isLoading };
}

export function usePrograms() {
  const url = `${restBaseUrl}/program?v=custom:(uuid,name)`;
  const { data, error, isLoading } = useSWR<{ data: { results: Array<NamedOption> } }>(url, openmrsFetch);
  return { programs: data?.data?.results ?? [], error, isLoading };
}
