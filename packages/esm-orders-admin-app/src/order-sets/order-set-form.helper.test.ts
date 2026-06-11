import { mapFormValuesToSavePayload, mapOrderSetToFormValues } from './order-set-form.helper';
import type { OrderSetListItem } from '../types';

const drugOrderTypeUuid = '131168f4-15f5-102d-96e4-000c29c2a5d7';

describe('order-set-form.helper', () => {
  it('maps form values with optional member dosing to save payload', () => {
    const payload = mapFormValuesToSavePayload(
      {
        name: 'Pain relief bundle',
        description: 'Common analgesics',
        operator: 'ANY',
        members: [
          {
            drugUuid: 'drug-uuid',
            drugDisplay: 'Paracetamol 500 mg tablet',
            conceptUuid: 'concept-uuid',
            dose: 500,
            doseUnits: [{ uuid: 'unit-uuid', display: 'mg', isDefault: true }],
            routeUuid: 'route-uuid',
            routeDisplay: 'Oral',
            frequencyUuid: 'frequency-uuid',
            frequencyDisplay: 'Once daily',
            asNeeded: false,
            asNeededCondition: '',
          },
        ],
      },
      drugOrderTypeUuid,
    );

    expect(payload.orderSetMembers).toHaveLength(1);
    expect(JSON.parse(payload.orderSetMembers[0].orderTemplate ?? '{}')).toEqual({
      type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
      drug: 'drug-uuid',
      dosingType: 'org.openmrs.SimpleDosingInstructions',
      dosingInstructions: {
        dose: [{ value: 500, default: true }],
        units: [{ value: 'mg', valueCoded: 'unit-uuid', default: true }],
        route: [{ value: 'Oral', valueCoded: 'route-uuid', default: true }],
        frequency: [{ value: 'Once daily', valueCoded: 'frequency-uuid', default: true }],
        asNeeded: false,
        asNeededCondition: undefined,
      },
    });
  });

  it('maps saved order set member dosing back to form values', () => {
    const orderSet: OrderSetListItem = {
      uuid: 'order-set-uuid',
      name: 'Pain relief bundle',
      description: 'Common analgesics',
      retired: false,
      operator: 'ALL',
      orderSetMembers: [
        {
          uuid: 'member-uuid',
          retired: false,
          display: 'Paracetamol 500 mg tablet',
          concept: { uuid: 'concept-uuid', display: 'Paracetamol' },
          orderTemplate: JSON.stringify({
            type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
            drug: 'drug-uuid',
            dosingType: 'org.openmrs.SimpleDosingInstructions',
            dosingInstructions: {
              dose: [{ value: 500, default: true }],
              units: [{ value: 'mg', valueCoded: 'unit-uuid', default: true }],
              route: [{ value: 'Oral', valueCoded: 'route-uuid', default: true }],
              frequency: [{ value: 'Once daily', valueCoded: 'frequency-uuid', default: true }],
              asNeeded: false,
            },
          }),
        },
      ],
    };

    expect(mapOrderSetToFormValues(orderSet)).toEqual({
      name: 'Pain relief bundle',
      description: 'Common analgesics',
      operator: 'ALL',
      members: [
        {
          uuid: 'member-uuid',
          drugUuid: 'drug-uuid',
          drugDisplay: 'Paracetamol 500 mg tablet',
          conceptUuid: 'concept-uuid',
          dose: 500,
          doseUnits: [{ uuid: 'unit-uuid', display: 'mg', isDefault: true }],
          routeUuid: 'route-uuid',
          routeDisplay: 'Oral',
          frequencyUuid: 'frequency-uuid',
          frequencyDisplay: 'Once daily',
          asNeeded: false,
          asNeededCondition: '',
        },
      ],
    });
  });

  it('saves minimal member template when dosing is omitted', () => {
    const payload = mapFormValuesToSavePayload(
      {
        name: 'Minimal bundle',
        description: 'Drug only',
        operator: 'ALL',
        members: [
          {
            drugUuid: 'drug-uuid',
            drugDisplay: 'Paracetamol 500 mg tablet',
            conceptUuid: 'concept-uuid',
            dose: null,
            doseUnits: [],
            routeUuid: '',
            routeDisplay: '',
            frequencyUuid: '',
            frequencyDisplay: '',
            asNeeded: false,
            asNeededCondition: '',
          },
        ],
      },
      drugOrderTypeUuid,
    );

    expect(JSON.parse(payload.orderSetMembers[0].orderTemplate ?? '{}')).toMatchObject({
      drug: 'drug-uuid',
      dosingInstructions: {
        dose: [],
        units: [],
        route: [],
        frequency: [],
        asNeeded: false,
      },
    });
  });
});
