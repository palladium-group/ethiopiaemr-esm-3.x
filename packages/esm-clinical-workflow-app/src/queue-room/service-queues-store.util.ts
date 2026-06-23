import { createGlobalStore, useStore } from '@openmrs/esm-framework';

const SERVICE_QUEUES_STORE_NAME = 'serviceQueues';

export interface ServiceQueuesFilterState {
  selectedQueueLocationName?: string;
  selectedQueueLocationUuid?: string;
  selectedServiceUuid?: string;
  selectedServiceDisplay?: string;
  selectedQueueStatusUuid?: string;
  selectedQueueStatusDisplay?: string;
}

function updateValueInSessionStorage(key: string, value: string | undefined) {
  if (value === undefined || value === null) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
  }
}

function getValueFromSessionStorage(key: string): string | undefined {
  return sessionStorage.getItem(key) ?? undefined;
}

const initialServiceQueuesState: ServiceQueuesFilterState = {
  selectedQueueLocationName: getValueFromSessionStorage('queueLocationName'),
  selectedQueueLocationUuid: getValueFromSessionStorage('queueLocationUuid'),
  selectedServiceUuid: getValueFromSessionStorage('queueServiceUuid'),
  selectedServiceDisplay: getValueFromSessionStorage('queueServiceDisplay'),
  selectedQueueStatusUuid: getValueFromSessionStorage('queueStatusUuid'),
  selectedQueueStatusDisplay: getValueFromSessionStorage('queueStatusDisplay'),
};

const serviceQueuesStore = createGlobalStore<ServiceQueuesFilterState>(
  SERVICE_QUEUES_STORE_NAME,
  initialServiceQueuesState,
);

export function useServiceQueuesFilterState() {
  return useStore(serviceQueuesStore);
}

export function updateSelectedQueueStatus(statusUuid: string | undefined, statusDisplay: string | undefined) {
  updateValueInSessionStorage('queueStatusUuid', statusUuid);
  updateValueInSessionStorage('queueStatusDisplay', statusDisplay);
  serviceQueuesStore.setState({
    selectedQueueStatusUuid: statusUuid,
    selectedQueueStatusDisplay: statusDisplay,
  });
}

export function updateSelectedService(serviceUuid: string | null, serviceDisplay: string) {
  updateValueInSessionStorage('queueServiceUuid', serviceUuid ?? undefined);
  updateValueInSessionStorage('queueServiceDisplay', serviceDisplay);
  serviceQueuesStore.setState({
    selectedServiceUuid: serviceUuid ?? undefined,
    selectedServiceDisplay: serviceDisplay,
  });
}

export function updateSelectedQueueLocationUuid(locationUuid: string | null) {
  updateValueInSessionStorage('queueLocationUuid', locationUuid ?? undefined);
  serviceQueuesStore.setState({
    selectedQueueLocationUuid: locationUuid ?? undefined,
  });
}

export function updateSelectedQueueLocationName(locationName: string | null) {
  updateValueInSessionStorage('queueLocationName', locationName ?? undefined);
  serviceQueuesStore.setState({
    selectedQueueLocationName: locationName ?? undefined,
  });
}
