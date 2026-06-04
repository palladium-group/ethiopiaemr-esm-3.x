import {
  attach,
  detach,
  getAssignedExtensions,
  getConfigStore,
  getExtensionNameFromId,
  getGlobalStore,
} from '@openmrs/esm-framework';
import { moduleName } from './constants';
import { type ConfigObject } from './config-schema';

export const ethioOrderCatalogPanelExtensionId = 'ethio-order-catalog-panel';

export const legacyOrderBasketPanelExtensionIds = [
  'lab-order-panel',
  'imaging-order-panel',
  'procedures-order-panel',
] as const;

const orderBasketSlotName = 'order-basket-slot';
const patientOrdersModuleName = '@openmrs/esm-patient-orders-app';
const slotConfigSource = 'ethio-order-catalog-order-basket-slot';

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

function isExtensionNameAttachedToSlot(slotName: string, extensionName: string): boolean {
  return findAttachedIdByExtensionName(slotName, extensionName) !== undefined;
}

function detachAllByExtensionName(slotName: string, extensionName: string) {
  let attachedId = findAttachedIdByExtensionName(slotName, extensionName);
  while (attachedId) {
    detach(slotName, attachedId);
    attachedId = findAttachedIdByExtensionName(slotName, extensionName);
  }
}

function attachOnceByExtensionName(slotName: string, extensionName: string) {
  if (!isExtensionNameAttachedToSlot(slotName, extensionName)) {
    attach(slotName, extensionName);
  }
}

/**
 * Slot `remove` is merged with content `configure` (deep merge). It hides extensions even if
 * their modules attach after startup — unlike detach-only, which can miss module-qualified IDs.
 */
function syncSlotConfigViaProvide(orderCatalogEnabled: boolean) {
  const remove = orderCatalogEnabled ? [...legacyOrderBasketPanelExtensionIds] : [ethioOrderCatalogPanelExtensionId];

  const config = {
    [patientOrdersModuleName]: {
      extensionSlots: {
        [orderBasketSlotName]: { remove },
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

function isSlotStateAsDesired(orderCatalogEnabled: boolean): boolean {
  const assignedNames = new Set(getAssignedExtensions(orderBasketSlotName).map((extension) => extension.name));

  if (orderCatalogEnabled) {
    return (
      assignedNames.has(ethioOrderCatalogPanelExtensionId) &&
      !legacyOrderBasketPanelExtensionIds.some((name) => assignedNames.has(name))
    );
  }

  return !assignedNames.has(ethioOrderCatalogPanelExtensionId);
}

/**
 * Toggle basket panels on `order-basket-slot` using config `remove` plus attach/detach cleanup.
 */
export function syncOrderBasketSlotForCatalogToggle(orderCatalogEnabled: boolean) {
  syncSlotConfigViaProvide(orderCatalogEnabled);

  if (orderCatalogEnabled) {
    legacyOrderBasketPanelExtensionIds.forEach((extensionName) => {
      detachAllByExtensionName(orderBasketSlotName, extensionName);
    });
    attachOnceByExtensionName(orderBasketSlotName, ethioOrderCatalogPanelExtensionId);
    return;
  }

  detachAllByExtensionName(orderBasketSlotName, ethioOrderCatalogPanelExtensionId);
}

function getOrderCatalogEnabledFromConfig(): boolean | undefined {
  const { config, loaded } = getConfigStore(moduleName).getState();
  if (!loaded || !config) {
    return undefined;
  }

  return Boolean((config as ConfigObject).orderCatalogEnabled);
}

function enforceSlotIfNeeded() {
  const orderCatalogEnabled = getOrderCatalogEnabledFromConfig();
  if (orderCatalogEnabled === undefined) {
    return;
  }

  if (!isSlotStateAsDesired(orderCatalogEnabled)) {
    syncOrderBasketSlotForCatalogToggle(orderCatalogEnabled);
  }
}

export function subscribeOrderBasketSlotToCatalogConfig() {
  const configStore = getConfigStore(moduleName);
  let lastApplied: boolean | undefined;

  const applyConfigChange = () => {
    const orderCatalogEnabled = getOrderCatalogEnabledFromConfig();
    if (orderCatalogEnabled === undefined || lastApplied === orderCatalogEnabled) {
      return;
    }

    lastApplied = orderCatalogEnabled;
    syncOrderBasketSlotForCatalogToggle(orderCatalogEnabled);
  };

  applyConfigChange();
  enforceSlotIfNeeded();

  const unsubscribeConfig = configStore.subscribe(applyConfigChange);
  const unsubscribeExtensions = getExtensionsInternalStore().subscribe(enforceSlotIfNeeded);

  return () => {
    unsubscribeConfig();
    unsubscribeExtensions();
  };
}
