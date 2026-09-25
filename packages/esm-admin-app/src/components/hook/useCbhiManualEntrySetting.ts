import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

export const GP_ALLOW_CBHI_MANUAL_ENTRY = 'ethiopiaemrcustommodule.allowCbhiManualEntry';

export function useCbhiManualEntrySetting() {
  const { data, error, isLoading, mutate } = useSWR<{
    data: { results: Array<{ uuid: string; property: string; value: string }> };
  }>(`/ws/rest/v1/systemsetting?q=${GP_ALLOW_CBHI_MANUAL_ENTRY}&v=custom:(uuid,property,value)`, openmrsFetch);

  const setting = data?.data?.results?.find((result) => result.property === GP_ALLOW_CBHI_MANUAL_ENTRY);

  const isManualEntryEnabled =
    typeof setting?.value === 'string' ? setting.value.trim().toLowerCase() === 'true' : false;

  return {
    isManualEntryEnabled,
    settingUuid: setting?.uuid,
    isLoading,
    error,
    mutate,
  };
}

export async function saveCbhiManualEntrySetting(enabled: boolean, uuid?: string) {
  const value = enabled ? 'true' : 'false';
  if (uuid) {
    return openmrsFetch(`/ws/rest/v1/systemsetting/${uuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { value },
    });
  } else {
    return openmrsFetch(`/ws/rest/v1/systemsetting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        property: GP_ALLOW_CBHI_MANUAL_ENTRY,
        value,
      },
    });
  }
}
