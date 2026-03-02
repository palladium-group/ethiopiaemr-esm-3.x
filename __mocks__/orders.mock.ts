export const mockOrders = [
  {
    uuid: 'drug-order-1',
    orderNumber: 'ORD-321',
    dateActivated: '2024-11-22T10:00:00.000+0000',
    type: 'drugorder',
    orderType: {
      uuid: '131168f4-15f5-102d-96e4-000c29c2a5d7',
      display: 'drug order',
      name: 'Drug Order',
    },
    display: '(NEW) Permethrin: 1.0 Ampule(s) Oral Once daily 1 Days take after eating',
    urgency: 'ROUTINE',
    fulfillerStatus: 'RECEIVED',
    orderer: {
      uuid: 'orderer-uuid-1',
      display: 'admin - Super User',
      person: { display: 'Super User' },
    },
    encounter: {
      uuid: 'encounter-uuid-1',
      visit: {
        uuid: 'visit-uuid-1',
      },
    },
    quantity: 1,
    quantityUnits: {
      uuid: 'quantity-unit-uuid',
      display: 'Ampule(s)',
    },
  },
  {
    uuid: 'test-order-1',
    orderNumber: 'ORD-654',
    dateActivated: '2024-11-23T11:00:00.000+0000',
    type: 'testorder',
    orderType: {
      uuid: '52a447d3-a64a-11e3-9aeb-50e549534c5e',
      display: 'test order',
      name: 'Test Order',
    },
    display: 'Serum chloride',
    urgency: 'ROUTINE',
    fulfillerStatus: 'RECEIVED',
    orderer: {
      uuid: 'orderer-uuid-2',
      display: 'admin - Super User',
      person: { display: 'Super User' },
    },
    encounter: {
      uuid: 'encounter-uuid-2',
      visit: {
        uuid: 'visit-uuid-2',
      },
    },
  },
];
