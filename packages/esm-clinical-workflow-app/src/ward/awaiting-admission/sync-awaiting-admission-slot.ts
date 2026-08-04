import { detach, getAssignedExtensions, getExtensionNameFromId, getGlobalStore } from '@openmrs/esm-framework';

export const ethiopiaAwaitingAdmissionTableExtensionId = 'ethiopia-awaiting-admission-patients-table';
export const kenyaAwaitingAdmissionTableExtensionId = 'ward-patients-awaiting-admission';

export const wardPatientsAwaitingAdmissionSlotName = 'ward-patients-awaiting-admission-slot';
const wardAppModuleName = '@kenyaemr/esm-ward-app';
const slotConfigSource = 'ethiopia-awaiting-admission-patients-slot';

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

function syncAwaitingAdmissionSlotConfig() {
  const config = {
    [wardAppModuleName]: {
      extensionSlots: {
        [wardPatientsAwaitingAdmissionSlotName]: {
          remove: [kenyaAwaitingAdmissionTableExtensionId],
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

function isAwaitingAdmissionSlotAsDesired(): boolean {
  const assignedNames = new Set(
    getAssignedExtensions(wardPatientsAwaitingAdmissionSlotName).map((extension) => extension.name),
  );

  return (
    assignedNames.has(ethiopiaAwaitingAdmissionTableExtensionId) &&
    !assignedNames.has(kenyaAwaitingAdmissionTableExtensionId)
  );
}

export function syncAwaitingAdmissionSlot() {
  syncAwaitingAdmissionSlotConfig();
  detachAllByExtensionName(wardPatientsAwaitingAdmissionSlotName, kenyaAwaitingAdmissionTableExtensionId);
}

function enforceAwaitingAdmissionSlotIfNeeded() {
  if (!isAwaitingAdmissionSlotAsDesired()) {
    syncAwaitingAdmissionSlot();
  }
}

export function subscribeAwaitingAdmissionSlotSync() {
  enforceAwaitingAdmissionSlotIfNeeded();

  const unsubscribeExtensions = getExtensionsInternalStore().subscribe(enforceAwaitingAdmissionSlotIfNeeded);

  return () => {
    unsubscribeExtensions();
  };
}
