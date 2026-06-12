import {
  formatMemberDosingSummary,
  getDefaultSelectedMemberUuids,
  getMemberDrugUuid,
  isMemberSelectionValid,
  parseMemberOrderTemplate,
} from './order-set.helper';
import type { OrderSetMemberDetail } from './order-set.resource';

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
