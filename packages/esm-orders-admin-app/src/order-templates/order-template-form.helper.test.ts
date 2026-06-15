import {
  mapFormValuesToSavePayload,
  mapOrderTemplateToFormValues,
  normalizeDoseUnits,
} from './order-template-form.helper';
import type { OrderTemplateListItem } from '../types';

describe('order-template-form.helper', () => {
  it('maps form values to O3 drug order template payload', () => {
    const payload = mapFormValuesToSavePayload({
      name: 'Paracetamol 500mg',
      description: 'Standard dose',
      drugUuid: 'drug-uuid',
      drugDisplay: 'Paracetamol 500 mg tablet',
      conceptUuid: 'concept-uuid',
      dose: 500,
      doseUnits: [
        { uuid: 'unit-uuid', display: 'mg', isDefault: true },
        { uuid: 'tablet-uuid', display: 'tab', isDefault: false },
      ],
      routeUuid: 'route-uuid',
      routeDisplay: 'Oral',
      frequencyUuid: 'frequency-uuid',
      frequencyDisplay: 'Once daily',
      asNeeded: true,
      asNeededCondition: 'pain',
    });

    expect(payload).toEqual({
      uuid: undefined,
      name: 'Paracetamol 500mg',
      description: 'Standard dose',
      concept: 'concept-uuid',
      drug: 'drug-uuid',
      template: JSON.stringify({
        type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
        dosingType: 'org.openmrs.SimpleDosingInstructions',
        dosingInstructions: {
          dose: [{ value: 500, default: true }],
          units: [
            { value: 'mg', valueCoded: 'unit-uuid', default: true },
            { value: 'tab', valueCoded: 'tablet-uuid', default: false },
          ],
          route: [{ value: 'Oral', valueCoded: 'route-uuid', default: true }],
          frequency: [{ value: 'Once daily', valueCoded: 'frequency-uuid', default: true }],
          asNeeded: true,
          asNeededCondition: 'pain',
        },
      }),
    });
  });

  it('maps minimal required fields to payload with empty optional dosing values', () => {
    const payload = mapFormValuesToSavePayload({
      name: 'Paracetamol template',
      description: 'For mild pain',
      drugUuid: 'drug-uuid',
      drugDisplay: 'Paracetamol 500 mg tablet',
      conceptUuid: 'concept-uuid',
      dose: null,
      doseUnits: [{ uuid: 'unit-uuid', display: 'mg', isDefault: true }],
      routeUuid: '',
      routeDisplay: '',
      frequencyUuid: '',
      frequencyDisplay: '',
      asNeeded: false,
      asNeededCondition: '',
    });

    expect(JSON.parse(payload.template).dosingInstructions).toEqual({
      dose: [],
      units: [{ value: 'mg', valueCoded: 'unit-uuid', default: true }],
      route: [],
      frequency: [],
      asNeeded: false,
      asNeededCondition: undefined,
    });
  });

  it('maps saved order template with multiple units to form values', () => {
    const orderTemplate: OrderTemplateListItem = {
      uuid: 'template-uuid',
      name: 'Paracetamol 500mg',
      description: 'Standard dose',
      retired: false,
      drug: {
        uuid: 'drug-uuid',
        display: 'Paracetamol 500 mg tablet',
      },
      concept: {
        uuid: 'concept-uuid',
        display: 'Paracetamol',
      },
      template: JSON.stringify({
        type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
        dosingType: 'org.openmrs.SimpleDosingInstructions',
        dosingInstructions: {
          dose: [{ value: 500, default: true }],
          units: [
            { value: 'mg', valueCoded: 'unit-uuid', default: true },
            { value: 'tab', valueCoded: 'tablet-uuid', default: false },
          ],
          route: [{ value: 'Oral', valueCoded: 'route-uuid', default: true }],
          frequency: [{ value: 'Once daily', valueCoded: 'frequency-uuid', default: true }],
          asNeeded: false,
        },
      }),
    };

    expect(mapOrderTemplateToFormValues(orderTemplate)).toEqual({
      name: 'Paracetamol 500mg',
      description: 'Standard dose',
      drugUuid: 'drug-uuid',
      drugDisplay: 'Paracetamol 500 mg tablet',
      conceptUuid: 'concept-uuid',
      dose: 500,
      doseUnits: [
        { uuid: 'unit-uuid', display: 'mg', isDefault: true },
        { uuid: 'tablet-uuid', display: 'tab', isDefault: false },
      ],
      routeUuid: 'route-uuid',
      routeDisplay: 'Oral',
      frequencyUuid: 'frequency-uuid',
      frequencyDisplay: 'Once daily',
      asNeeded: false,
      asNeededCondition: '',
    });
  });

  it('ensures exactly one default dose unit', () => {
    expect(
      normalizeDoseUnits([
        { uuid: 'a', display: 'mg', isDefault: false },
        { uuid: 'b', display: 'tab', isDefault: false },
      ]),
    ).toEqual([
      { uuid: 'a', display: 'mg', isDefault: true },
      { uuid: 'b', display: 'tab', isDefault: false },
    ]);
  });
});
