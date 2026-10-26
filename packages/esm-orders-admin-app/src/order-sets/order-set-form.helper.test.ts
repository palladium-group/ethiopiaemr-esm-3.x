import { mapFormValuesToSavePayload, mapOrderSetToFormValues, unescapeRestText } from './order-set-form.helper';
import { ORDER_SET_INSTRUCTIONS_ATTRIBUTE_TYPE_UUID } from '../constants';
import type { OrderSetListItem } from '../types';

const drugOrderTypeUuid = '131168f4-15f5-102d-96e4-000c29c2a5d7';

describe('order-set-form.helper', () => {
  it('maps form values with optional member dosing to save payload', () => {
    const payload = mapFormValuesToSavePayload(
      {
        name: 'Pain relief bundle',
        description: 'Common analgesics',
        instructions: '',
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
            instructions: '',
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
      instructions: '',
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
          instructions: '',
        },
      ],
    });
  });

  it('saves minimal member template when dosing is omitted', () => {
    const payload = mapFormValuesToSavePayload(
      {
        name: 'Minimal bundle',
        description: 'Drug only',
        instructions: '',
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
            instructions: '',
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

  it('round-trips member instructions through the order template', () => {
    const instructions = 'IV push slowly over 10 minutes.\nFor IV use only.';
    const payload = mapFormValuesToSavePayload(
      {
        name: 'ABVD',
        description: 'Hodgkin lymphoma',
        instructions: '',
        operator: 'ALL',
        members: [
          {
            drugUuid: 'drug-uuid',
            drugDisplay: 'Vincristine 2 mg injection',
            conceptUuid: 'concept-uuid',
            dose: null,
            doseUnits: [],
            routeUuid: '',
            routeDisplay: '',
            frequencyUuid: '',
            frequencyDisplay: '',
            asNeeded: false,
            asNeededCondition: '',
            instructions: `  ${instructions}  `,
          },
        ],
      },
      drugOrderTypeUuid,
    );

    const orderTemplate = payload.orderSetMembers[0].orderTemplate;
    expect(JSON.parse(orderTemplate ?? '{}').dosingInstructions.instructions).toEqual([
      { value: instructions, default: true },
    ]);

    const formValues = mapOrderSetToFormValues({
      uuid: 'order-set-uuid',
      name: 'ABVD',
      description: 'Hodgkin lymphoma',
      retired: false,
      operator: 'ALL',
      orderSetMembers: [{ uuid: 'member-uuid', retired: false, orderTemplate }],
    });
    expect(formValues.members[0].instructions).toBe(instructions);
  });

  it('omits instructions from the member template when left blank', () => {
    const payload = mapFormValuesToSavePayload(
      {
        name: 'Minimal bundle',
        description: 'Drug only',
        instructions: '',
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
            instructions: '   ',
          },
        ],
      },
      drugOrderTypeUuid,
    );

    expect(JSON.parse(payload.orderSetMembers[0].orderTemplate ?? '{}').dosingInstructions).not.toHaveProperty(
      'instructions',
    );
  });

  it('saves protocol instructions as an order set attribute and clears it when blank', () => {
    const values = { name: 'ABVD', description: 'Hodgkin lymphoma', operator: 'ALL' as const, members: [] };

    expect(
      mapFormValuesToSavePayload({ ...values, instructions: '  ANC >750 before starting  ' }, drugOrderTypeUuid)
        .attributes,
    ).toEqual([{ attributeType: ORDER_SET_INSTRUCTIONS_ATTRIBUTE_TYPE_UUID, value: 'ANC >750 before starting' }]);

    expect(mapFormValuesToSavePayload({ ...values, instructions: '   ' }, drugOrderTypeUuid).attributes).toEqual([]);
  });

  it('reads protocol instructions from the order set attribute and decodes server-encoded text', () => {
    const formValues = mapOrderSetToFormValues({
      uuid: 'order-set-uuid',
      name: 'ABVD',
      description: 'ANC &gt;750 &amp; PLT &gt;75,000',
      retired: false,
      operator: 'ALL',
      attributes: [
        { uuid: 'other-attribute', value: 'ignored', attributeType: { uuid: 'other-type' } },
        {
          uuid: 'instructions-attribute',
          value: 'If ANC &lt; 500 hold all chemotherapy',
          attributeType: { uuid: ORDER_SET_INSTRUCTIONS_ATTRIBUTE_TYPE_UUID },
        },
      ],
      orderSetMembers: [],
    });

    expect(formValues.description).toBe('ANC >750 & PLT >75,000');
    expect(formValues.instructions).toBe('If ANC < 500 hold all chemotherapy');
  });

  it('decodes text that was encoded more than once', () => {
    expect(unescapeRestText('ANC &amp;gt; 750')).toBe('ANC > 750');
    expect(unescapeRestText(undefined)).toBe('');
  });
});
