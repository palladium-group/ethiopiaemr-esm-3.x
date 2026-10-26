import { type Visit } from '@openmrs/esm-framework';
import { buildMedicationOrder, prepMedicationOrderPostData } from '../../api/api';
import type { DrugSearchResult } from './drug-search.resource';
import {
  buildBasketItemFromOrderSetMember,
  formatMemberDosingSummary,
  getDefaultSelectedMemberUuids,
  getMemberDrugUuid,
  getMemberInstructions,
  getOrderSetInstructions,
  isMemberSelectionValid,
  parseMemberOrderTemplate,
} from './order-set.helper';
import type { OrderSetDetail, OrderSetMemberDetail } from './order-set.resource';

const memberTemplate = JSON.stringify({
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
});

const members: Array<OrderSetMemberDetail> = [
  { uuid: 'member-1', retired: false, orderTemplate: memberTemplate },
  { uuid: 'member-2', retired: false, orderTemplate: memberTemplate },
  { uuid: 'member-3', retired: true, orderTemplate: memberTemplate },
];

describe('order-set.helper', () => {
  it('parses member drug uuid from order template json', () => {
    expect(getMemberDrugUuid(members[0])).toBe('drug-uuid');
    expect(parseMemberOrderTemplate(memberTemplate)?.drug).toBe('drug-uuid');
  });

  it('formats member dosing summary', () => {
    expect(formatMemberDosingSummary(members[0])).toBe('500 · mg · once daily · oral');
  });

  it('reads member instructions from the order template', () => {
    const template = JSON.parse(memberTemplate);
    template.dosingInstructions.instructions = [{ value: 'IV push slowly over 10 minutes', default: true }];
    const member: OrderSetMemberDetail = { uuid: 'member-4', retired: false, orderTemplate: JSON.stringify(template) };

    expect(getMemberInstructions(member)).toBe('IV push slowly over 10 minutes');
    expect(getMemberInstructions(members[0])).toBe('');
    expect(getMemberInstructions({ uuid: 'member-5', retired: false })).toBe('');
  });

  it('decodes server-encoded member instructions', () => {
    const template = JSON.parse(memberTemplate);
    template.dosingInstructions.instructions = [{ value: 'Hold if ANC &lt; 500', default: true }];

    expect(getMemberInstructions({ uuid: 'member-6', retired: false, orderTemplate: JSON.stringify(template) })).toBe(
      'Hold if ANC < 500',
    );
  });

  describe('protocol instructions', () => {
    const attributeTypeUuid = 'instructions-type-uuid';
    const orderSet: OrderSetDetail = {
      uuid: 'order-set-uuid',
      name: 'HL ABVD',
      retired: false,
      operator: 'ALL',
      attributes: [
        { uuid: 'attribute-1', value: 'unrelated', attributeType: { uuid: 'other-type-uuid' } },
        { uuid: 'attribute-2', value: ' ANC &gt;750 before starting \n', attributeType: { uuid: attributeTypeUuid } },
      ],
    };
    const drug = {
      uuid: 'drug-uuid',
      display: 'Vincristine 2 mg injection',
      concept: { uuid: 'concept-uuid', display: 'Vincristine' },
    } as DrugSearchResult;
    const visit = { uuid: 'visit-uuid' } as Visit;
    const instructionsTemplate = JSON.parse(memberTemplate);
    instructionsTemplate.dosingInstructions.instructions = [{ value: 'IV push over 10 minutes', default: true }];
    const member: OrderSetMemberDetail = {
      uuid: 'member-7',
      retired: false,
      orderTemplate: JSON.stringify(instructionsTemplate),
    };

    it('reads and decodes the order set instructions attribute', () => {
      expect(getOrderSetInstructions(orderSet, attributeTypeUuid)).toBe('ANC >750 before starting');
      expect(getOrderSetInstructions({ ...orderSet, attributes: [] }, attributeTypeUuid)).toBe('');
      expect(getOrderSetInstructions(undefined, attributeTypeUuid)).toBe('');
    });

    it('prefills patient instructions from the member and stamps the protocol note on the order', () => {
      const basketItem = buildBasketItemFromOrderSetMember(drug, visit, member, undefined, {
        orderSetName: 'HL ABVD',
        instructions: 'ANC >750 before starting',
      });

      expect(basketItem.patientInstructions).toBe('IV push over 10 minutes');
      expect(basketItem.instructions).toBe('Protocol: HL ABVD\nANC >750 before starting');

      const payload = prepMedicationOrderPostData(basketItem, 'patient-uuid', 'encounter-uuid', 'provider-uuid');
      expect(payload).toMatchObject({
        dosingInstructions: 'IV push over 10 minutes',
        instructions: 'Protocol: HL ABVD\nANC >750 before starting',
      });
    });

    it('keeps the protocol note and does not double-encode text when an order is revised', () => {
      const existingOrder = {
        uuid: 'order-uuid',
        drug,
        dosingType: 'org.openmrs.SimpleDosingInstructions',
        dosingInstructions: 'Hold if ANC &lt; 500',
        instructions: 'Protocol: HL ABVD\nANC &gt;750 before starting',
        orderReasonNonCoded: 'Fever &amp; pain',
        dateActivated: '2026-10-08T10:00:00.000+0000',
        encounter: { uuid: 'encounter-uuid', visit },
      } as unknown as Parameters<typeof buildMedicationOrder>[0];

      const basketItem = buildMedicationOrder(existingOrder, 'REVISE');
      expect(basketItem.patientInstructions).toBe('Hold if ANC < 500');
      expect(basketItem.indication).toBe('Fever & pain');

      expect(prepMedicationOrderPostData(basketItem, 'patient-uuid', 'encounter-uuid', 'provider-uuid')).toMatchObject({
        action: 'REVISE',
        dosingInstructions: 'Hold if ANC < 500',
        instructions: 'Protocol: HL ABVD\nANC >750 before starting',
      });
    });

    it('does not stamp orders when the order set has no protocol instructions', () => {
      const basketItem = buildBasketItemFromOrderSetMember(drug, visit, member, undefined, {
        orderSetName: 'HL ABVD',
        instructions: '',
      });

      expect(basketItem.instructions).toBeUndefined();
      expect(
        prepMedicationOrderPostData(basketItem, 'patient-uuid', 'encounter-uuid', 'provider-uuid'),
      ).not.toHaveProperty('instructions', expect.anything());
    });
  });

  it('selects all active members by default for ALL and ANY', () => {
    expect(getDefaultSelectedMemberUuids(members, 'ALL')).toEqual(['member-1', 'member-2']);
    expect(getDefaultSelectedMemberUuids(members, 'ANY')).toEqual(['member-1', 'member-2']);
  });

  it('selects first member by default for ONE', () => {
    expect(getDefaultSelectedMemberUuids(members, 'ONE')).toEqual(['member-1']);
  });

  it('validates member selection by operator', () => {
    expect(isMemberSelectionValid(['member-1', 'member-2'], 'ALL')).toBe(true);
    expect(isMemberSelectionValid(['member-1'], 'ONE')).toBe(true);
    expect(isMemberSelectionValid([], 'ONE')).toBe(false);
    expect(isMemberSelectionValid([], 'ANY')).toBe(false);
  });
});
