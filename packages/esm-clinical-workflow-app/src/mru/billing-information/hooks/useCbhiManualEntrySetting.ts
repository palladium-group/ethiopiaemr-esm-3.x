import useSWR from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../../config-schema';

export const GP_ALLOW_CBHI_MANUAL_ENTRY = 'ethiopiaemrcustommodule.allowCbhiManualEntry';

export interface UseCbhiManualEntrySettingResult {
  isManualEntryEnabled: boolean;
  settingUuid?: string;
  isLoading: boolean;
  error?: Error;
  mutate: () => void;
}

/**
 * Hook to read the official OpenMRS System Setting / Global Property for CBHI Manual Entry.
 * Falls back to frontend config (allowCbhiManualEntry) when setting is unset or pending.
 */
export function useCbhiManualEntrySetting(): UseCbhiManualEntrySettingResult {
  const { allowCbhiManualEntry: configDefault } = useConfig<ClinicalWorkflowConfig>();
  const { data, error, isLoading, mutate } = useSWR<{
    data: { results: Array<{ uuid: string; property: string; value: string }> };
  }>(`/ws/rest/v1/systemsetting?q=${GP_ALLOW_CBHI_MANUAL_ENTRY}&v=custom:(uuid,property,value)`, openmrsFetch, {
    revalidateOnFocus: false,
  });

  const setting = data?.data?.results?.find((result) => result.property === GP_ALLOW_CBHI_MANUAL_ENTRY);

  let isManualEntryEnabled = Boolean(configDefault);
  if (setting && typeof setting.value === 'string' && setting.value.trim() !== '') {
    isManualEntryEnabled = setting.value.trim().toLowerCase() === 'true';
  }

  return {
    isManualEntryEnabled,
    settingUuid: setting?.uuid,
    isLoading,
    error,
    mutate,
  };
}
