import { detach, getAssignedExtensions, getExtensionNameFromId, getGlobalStore } from '@openmrs/esm-framework';

export const ethiopiaAdmittedPatientsTableExtensionId = 'ethiopia-admitted-patients-table';
export const kenyaAdmittedPatientsTableExtensionId = 'ward-patients-admitted';

export const wardPatientsAdmittedSlotName = 'ward-patients-admitted-slot';
const wardAppModuleName = '@kenyaemr/esm-ward-app';
const slotConfigSource = 'ethiopia-admitted-patients-slot';

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

/**
 * Slot `remove` in implementer config can miss extensions that attach after startup.
 * Push remove into config-internal and detach so only the Ethiopia table remains.
 */
function syncAdmittedPatientsSlotConfig() {
  const config = {
    [wardAppModuleName]: {
      extensionSlots: {
        [wardPatientsAdmittedSlotName]: {
          remove: [kenyaAdmittedPatientsTableExtensionId],
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

function isAdmittedPatientsSlotAsDesired(): boolean {
  const assignedNames = new Set(getAssignedExtensions(wardPatientsAdmittedSlotName).map((extension) => extension.name));

  return (
    assignedNames.has(ethiopiaAdmittedPatientsTableExtensionId) &&
    !assignedNames.has(kenyaAdmittedPatientsTableExtensionId)
  );
}

export function syncAdmittedPatientsSlot() {
  syncAdmittedPatientsSlotConfig();
  detachAllByExtensionName(wardPatientsAdmittedSlotName, kenyaAdmittedPatientsTableExtensionId);
}

function enforceAdmittedPatientsSlotIfNeeded() {
  if (!isAdmittedPatientsSlotAsDesired()) {
    syncAdmittedPatientsSlot();
  }
}

export function subscribeAdmittedPatientsSlotSync() {
  enforceAdmittedPatientsSlotIfNeeded();

  const unsubscribeExtensions = getExtensionsInternalStore().subscribe(enforceAdmittedPatientsSlotIfNeeded);

  return () => {
    unsubscribeExtensions();
  };
}
