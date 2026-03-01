import type { OrderStockData } from '../packages/esm-patient-orders-app/src/types/order';

export const mockOrderStockData: OrderStockData = {
  resourceType: 'Bundle',
  id: 'mock-stock-bundle',
  meta: {
    lastUpdated: '2024-01-01T00:00:00.000Z',
  },
  type: 'searchset',
  link: [],
  entry: [
    {
      resource: {
        resourceType: 'InventoryItem',
        id: 'mock-inventory-item',
        meta: {
          profile: [],
        },
        status: 'active',
        code: [
          {
            coding: [
              {
                system: 'http://example.org',
                code: 'ITEM-001',
                display: 'Mock inventory item',
              },
            ],
          },
        ],
        name: [
          {
            name: 'Mock inventory item',
          },
        ],
        netContent: {
          value: 10,
          unit: 'units',
        },
      },
    },
  ],
};
