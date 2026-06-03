import { getGlobalStore } from '@openmrs/esm-framework';
import { syncOrderBasketSlotForCatalogToggle } from './order-catalog-extension-slot-config';

const attachMock = jest.fn();
const detachMock = jest.fn();

jest.mock('@openmrs/esm-framework', () => ({
  attach: (...args: unknown[]) => attachMock(...args),
  detach: (...args: unknown[]) => detachMock(...args),
  getAssignedExtensions: jest.fn(() => []),
  getConfigStore: jest.fn(),
  getExtensionNameFromId: (extensionId: string) => extensionId.split('#')[0],
  getGlobalStore: jest.fn(),
}));

const getGlobalStoreMock = jest.mocked(getGlobalStore);

type MockConfigInternalState = {
  providedConfigs: Array<{ source: string; config: Record<string, unknown> }>;
};

function getMockConfigInternalState(): MockConfigInternalState {
  return (getGlobalStoreMock('config-internal') as { getState: () => MockConfigInternalState }).getState();
}

function mockStores(initialAttachedIds: string[]) {
  let attachedIds = [...initialAttachedIds];
  let providedConfigs: Array<{ source: string; config: Record<string, unknown> }> = [];

  getGlobalStoreMock.mockImplementation((storeName: string) => {
    if (storeName === 'extensionsInternal') {
      return {
        getState: () => ({
          slots: {
            'order-basket-slot': { attachedIds },
          },
        }),
        subscribe: jest.fn(),
      } as never;
    }

    if (storeName === 'config-internal') {
      return {
        getState: () => ({ providedConfigs }),
        setState: (
          updater: (state: { providedConfigs: typeof providedConfigs }) => {
            providedConfigs: typeof providedConfigs;
          },
        ) => {
          const next = updater({ providedConfigs });
          providedConfigs = next.providedConfigs;
        },
      } as never;
    }

    throw new Error(`Unexpected store: ${storeName}`);
  });

  detachMock.mockImplementation((_slot: string, extensionId: string) => {
    const index = attachedIds.indexOf(extensionId);
    if (index >= 0) {
      attachedIds = attachedIds.filter((_, i) => i !== index);
    }
  });

  attachMock.mockImplementation((_slot: string, extensionId: string) => {
    attachedIds = [...attachedIds, extensionId];
  });
}

describe('syncOrderBasketSlotForCatalogToggle', () => {
  beforeEach(() => {
    attachMock.mockClear();
    detachMock.mockClear();
  });

  it('detaches legacy panels, applies config remove, and attaches the catalog when enabled', () => {
    mockStores(['lab-order-panel', 'lab-order-panel', 'imaging-order-panel', 'procedures-order-panel']);

    syncOrderBasketSlotForCatalogToggle(true);

    expect(detachMock).toHaveBeenCalledTimes(4);
    expect(attachMock).toHaveBeenCalledWith('order-basket-slot', 'ethio-order-catalog-panel');

    expect(getMockConfigInternalState().providedConfigs[0]).toMatchObject({
      source: 'ethio-order-catalog-order-basket-slot',
      config: {
        '@openmrs/esm-patient-orders-app': {
          extensionSlots: {
            'order-basket-slot': {
              remove: ['lab-order-panel', 'imaging-order-panel', 'procedures-order-panel'],
            },
          },
        },
      },
    });
  });

  it('does not attach the catalog panel when it is already on the slot', () => {
    mockStores(['ethio-order-catalog-panel']);

    syncOrderBasketSlotForCatalogToggle(true);

    expect(attachMock).not.toHaveBeenCalled();
  });

  it('detaches catalog instances, applies config remove, and does not attach legacy when disabled', () => {
    mockStores(['ethio-order-catalog-panel', 'ethio-order-catalog-panel', 'lab-order-panel']);

    syncOrderBasketSlotForCatalogToggle(false);

    expect(detachMock).toHaveBeenCalledTimes(2);
    expect(attachMock).not.toHaveBeenCalled();

    expect(getMockConfigInternalState().providedConfigs[0].config).toEqual({
      '@openmrs/esm-patient-orders-app': {
        extensionSlots: {
          'order-basket-slot': {
            remove: ['ethio-order-catalog-panel'],
          },
        },
      },
    });
  });
});
