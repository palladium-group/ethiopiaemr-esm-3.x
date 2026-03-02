import type { OrderPriceData } from '../packages/esm-patient-orders-app/src/types/order';

export const mockOrderPriceData: OrderPriceData = {
  resourceType: 'Bundle',
  id: 'mock-price-bundle',
  meta: {
    lastUpdated: '2024-01-01T00:00:00.000Z',
  },
  type: 'searchset',
  link: [],
  entry: [
    {
      resource: {
        resourceType: 'ChargeItemDefinition',
        id: 'mock-charge-item',
        name: 'Mock charge item',
        status: 'active',
        date: '2024-01-01T00:00:00.000Z',
        propertyGroup: [
          {
            priceComponent: [
              {
                type: 'base',
                amount: {
                  value: 99.99,
                  currency: 'USD',
                },
              },
            ],
          },
        ],
      },
    },
  ],
};
