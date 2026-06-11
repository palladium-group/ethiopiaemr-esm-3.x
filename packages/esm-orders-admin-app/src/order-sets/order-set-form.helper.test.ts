import { mapFormValuesToSavePayload, mapOrderSetToFormValues } from './order-set-form.helper';
import type { OrderSetListItem, OrderTemplateListItem } from '../types';

const drugOrderTypeUuid = '131168f4-15f5-102d-96e4-000c29c2a5d7';

const orderTemplates: Array<OrderTemplateListItem> = [
  {
    uuid: 'template-uuid',
    name: 'Paracetamol 500mg',
    retired: false,
    drug: {
      uuid: 'drug-uuid',
      display: 'Paracetamol 500 mg tablet',
      concept: { uuid: 'concept-uuid', display: 'Paracetamol' },
    },
    concept: { uuid: 'concept-uuid', display: 'Paracetamol' },
    template: JSON.stringify({
      type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
      dosingType: 'org.openmrs.SimpleDosingInstructions',
      dosingInstructions: {
        dose: [{ value: 500, default: true }],
        units: [{ value: 'mg', valueCoded: 'unit-uuid', default: true }],
      },
    }),
  },
];

describe('order-set-form.helper', () => {
  it('maps form values to order set save payload with member templates', () => {
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
            linkedTemplateUuid: 'template-uuid',
          },
        ],
      },
      drugOrderTypeUuid,
      orderTemplates,
    );

    expect(payload.name).toBe('Pain relief bundle');
    expect(payload.description).toBe('Common analgesics');
    expect(payload.operator).toBe('ANY');
    expect(payload.orderSetMembers).toHaveLength(1);
    expect(payload.orderSetMembers[0]).toMatchObject({
      concept: 'concept-uuid',
      orderType: drugOrderTypeUuid,
      retired: false,
    });
    expect(JSON.parse(payload.orderSetMembers[0].orderTemplate ?? '{}')).toEqual({
      type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
      drug: 'drug-uuid',
      dosingType: 'org.openmrs.SimpleDosingInstructions',
      dosingInstructions: {
        dose: [{ value: 500, default: true }],
        units: [{ value: 'mg', valueCoded: 'unit-uuid', default: true }],
      },
    });
  });

  it('maps saved order set to form values', () => {
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
          concept: { uuid: 'concept-uuid', display: 'Paracetamol' },
          orderTemplate: JSON.stringify({
            type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
            drug: 'drug-uuid',
            dosingType: 'org.openmrs.SimpleDosingInstructions',
            dosingInstructions: {
              dose: [{ value: 500, default: true }],
              units: [{ value: 'mg', valueCoded: 'unit-uuid', default: true }],
            },
          }),
        },
      ],
    };

    expect(mapOrderSetToFormValues(orderSet, orderTemplates)).toEqual({
      name: 'Pain relief bundle',
      description: 'Common analgesics',
      operator: 'ALL',
      members: [
        {
          uuid: 'member-uuid',
          drugUuid: 'drug-uuid',
          drugDisplay: 'Paracetamol 500 mg tablet',
          conceptUuid: 'concept-uuid',
          linkedTemplateUuid: 'template-uuid',
        },
      ],
    });
  });
});
