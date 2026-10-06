import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

export const GP_CARD_VALIDITY_DAYS = 'ethiopiaemrcustommodule.cardValidityDays';
export const DEFAULT_CARD_VALIDITY_DAYS = 30;

export function useCardValiditySetting() {
  const { data, error, isLoading, mutate } = useSWR<{
    data: { results: Array<{ uuid: string; property: string; value: string }> };
  }>(`/ws/rest/v1/systemsetting?q=${GP_CARD_VALIDITY_DAYS}&v=custom:(uuid,property,value)`, openmrsFetch);

  const setting = data?.data?.results?.find((result) => result.property === GP_CARD_VALIDITY_DAYS);

  let cardValidityDays = DEFAULT_CARD_VALIDITY_DAYS;
  if (setting?.value !== undefined && setting.value !== null && setting.value.trim() !== '') {
    const parsed = parseInt(setting.value.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      cardValidityDays = parsed;
    }
  }

  return {
    cardValidityDays,
    settingUuid: setting?.uuid,
    isLoading,
    error,
    mutate,
  };
}

export async function saveCardValiditySetting(days: number, uuid?: string) {
  const value = String(days);
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
        property: GP_CARD_VALIDITY_DAYS,
        value,
      },
    });
  }
}
