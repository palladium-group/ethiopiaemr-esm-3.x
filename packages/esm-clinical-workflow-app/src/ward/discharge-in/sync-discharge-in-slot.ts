import { detach, getAssignedExtensions, getExtensionNameFromId, getGlobalStore } from '@openmrs/esm-framework';

export const ethiopiaDischargeInPatientsTableExtensionId = 'ethiopia-discharge-in-patients-table';
export const kenyaDischargeInPatientsTableExtensionId = 'ward-patients-discharge-in';

export const wardPatientsDischargeInSlotName = 'ward-patients-discharge-in-slot';
const wardAppModuleName = '@kenyaemr/esm-ward-app';
const slotConfigSource = 'ethiopia-discharge-in-patients-slot';

type ExtensionsInternalState = {
  slots: Record<string, { attachedIds: string[] } | undefined>;
};

type ConfigInternalState = {
  providedConfigs: Array<{ source: string; config: Record<string, unknown> }>;
};

function getExtensionsInternalStore() {
  return getGlobalStore<ExtensionsInternalState>('extensionsInternal');
}

function getConfigInternalStore() {
  return getGlobalStore<ConfigInternalState>('config-internal');
}

function getInternalSlotAttachedIds(slotName: string): string[] {
  return getExtensionsInternalStore().getState().slots[slotName]?.attachedIds ?? [];
}

function findAttachedIdByExtensionName(slotName: string, extensionName: string): string | undefined {
  return getInternalSlotAttachedIds(slotName).find((id) => getExtensionNameFromId(id) === extensionName);
}

function detachAllByExtensionName(slotName: string, extensionName: string) {
  let attachedId = findAttachedIdByExtensionName(slotName, extensionName);
  while (attachedId) {
    detach(slotName, attachedId);
    attachedId = findAttachedIdByExtensionName(slotName, extensionName);
  }
}

function syncDischargeInSlotConfig() {
  const config = {
    [wardAppModuleName]: {
      extensionSlots: {
        [wardPatientsDischargeInSlotName]: {
          remove: [kenyaDischargeInPatientsTableExtensionId],
        },
      },
    },
  };

  const store = getConfigInternalStore();
  store.setState((state) => ({
    ...state,
    providedConfigs: [
      ...state.providedConfigs.filter((entry) => entry.source !== slotConfigSource),
      { source: slotConfigSource, config },
    ],
  }));
}

function isDischargeInSlotAsDesired(): boolean {
  const assignedNames = new Set(
    getAssignedExtensions(wardPatientsDischargeInSlotName).map((extension) => extension.name),
  );

  return (
    assignedNames.has(ethiopiaDischargeInPatientsTableExtensionId) &&
    !assignedNames.has(kenyaDischargeInPatientsTableExtensionId)
  );
}

export function syncDischargeInSlot() {
  syncDischargeInSlotConfig();
  detachAllByExtensionName(wardPatientsDischargeInSlotName, kenyaDischargeInPatientsTableExtensionId);
}

function enforceDischargeInSlotIfNeeded() {
  if (!isDischargeInSlotAsDesired()) {
    syncDischargeInSlot();
  }
}

export function subscribeDischargeInSlotSync() {
  enforceDischargeInSlotIfNeeded();

  const unsubscribeExtensions = getExtensionsInternalStore().subscribe(enforceDischargeInSlotIfNeeded);

  return () => {
    unsubscribeExtensions();
  };
}
