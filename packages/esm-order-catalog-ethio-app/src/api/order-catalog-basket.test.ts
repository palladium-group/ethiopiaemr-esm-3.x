import { buildCatalogBasketPayload, collectSelectedOrdersAcrossTabs } from './order-catalog-basket';
import { type CatalogTab } from '../types/order-catalog.types';

const mockVisit = { uuid: 'visit-1' } as import('@openmrs/esm-framework').Visit;

const tabs: Array<CatalogTab> = [
  {
    uuid: 'lab-tab',
    displayName: 'Lab',
    orderType: 'lab',
    categories: [
      {
        uuid: 'blood',
        displayName: 'Blood',
        tests: [
          {
            uuid: 'glucose-uuid',
            displayName: 'Glucose',
            conceptClassName: 'Test',
            conceptClassDescription: 'Test',
            isPanel: false,
            availability: 'available',
            childTests: [],
          },
        ],
      },
    ],
  },
];

describe('order-catalog-basket', () => {
  it('builds lab basket items from selected standalone tests', () => {
    const payload = buildCatalogBasketPayload(tabs, new Set(['glucose-uuid']), {}, mockVisit, 'provider-uuid');

    expect(payload.lab).toHaveLength(1);
    expect(payload.lab[0].testType.conceptUuid).toBe('glucose-uuid');
    expect(payload.lab[0].isOrderIncomplete).toBe(false);
    expect(payload.imaging).toHaveLength(0);
  });

  it('assigns order type from the tab when collecting selections', () => {
    const lines = collectSelectedOrdersAcrossTabs(tabs, new Set(['glucose-uuid']));
    expect(lines[0].orderType).toBe('lab');
  });

  it('places radiology selections in the imaging basket', () => {
    const radiologyTabs: Array<CatalogTab> = [
      {
        uuid: 'rad-tab',
        displayName: 'Radiology',
        orderType: 'radiology',
        categories: [
          {
            uuid: 'xray',
            displayName: 'X-Ray',
            tests: [
              {
                uuid: 'cxr-uuid',
                displayName: 'Chest X-Ray',
                conceptClassName: 'Test',
                conceptClassDescription: 'Test',
                isPanel: false,
                availability: 'available',
                childTests: [],
              },
            ],
          },
        ],
      },
    ];

    const payload = buildCatalogBasketPayload(
      radiologyTabs,
      new Set(['cxr-uuid']),
      { 'cxr-uuid': { urgency: 'ROUTINE', orderReasonNonCoded: 'clinical indication' } },
      mockVisit,
      'provider-uuid',
    );

    expect(payload.imaging).toHaveLength(1);
    expect(payload.imaging[0].testType.conceptUuid).toBe('cxr-uuid');
    expect(payload.procedures).toHaveLength(0);
  });
});
