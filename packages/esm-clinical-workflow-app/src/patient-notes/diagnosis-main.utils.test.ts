import {
  diagnosisAttributeValueIsTrue,
  diagnosisHasMainAttribute,
  resolveDiagnosisAttributeTypeUuid,
} from './diagnosis-main.utils';

const MAIN_ATTR = 'main-attr-uuid';

describe('diagnosis-main.utils', () => {
  describe('diagnosisAttributeValueIsTrue', () => {
    it('returns true for boolean true and string "true"', () => {
      expect(diagnosisAttributeValueIsTrue(true)).toBe(true);
      expect(diagnosisAttributeValueIsTrue('true')).toBe(true);
    });

    it('returns false for other values', () => {
      expect(diagnosisAttributeValueIsTrue(false)).toBe(false);
      expect(diagnosisAttributeValueIsTrue('false')).toBe(false);
      expect(diagnosisAttributeValueIsTrue(1)).toBe(false);
    });
  });

  describe('resolveDiagnosisAttributeTypeUuid', () => {
    it('resolves string attributeType', () => {
      expect(resolveDiagnosisAttributeTypeUuid(MAIN_ATTR)).toBe(MAIN_ATTR);
    });

    it('resolves object attributeType with uuid', () => {
      expect(resolveDiagnosisAttributeTypeUuid({ uuid: MAIN_ATTR, display: 'Main' })).toBe(MAIN_ATTR);
    });

    it('returns undefined for invalid attributeType', () => {
      expect(resolveDiagnosisAttributeTypeUuid(null)).toBeUndefined();
      expect(resolveDiagnosisAttributeTypeUuid({ display: 'Main' })).toBeUndefined();
    });
  });

  describe('diagnosisHasMainAttribute', () => {
    it('detects main when attributeType is a uuid string', () => {
      expect(diagnosisHasMainAttribute([{ attributeType: MAIN_ATTR, value: true }], MAIN_ATTR)).toBe(true);
    });

    it('detects main when attributeType is an object', () => {
      expect(diagnosisHasMainAttribute([{ attributeType: { uuid: MAIN_ATTR }, value: 'true' }], MAIN_ATTR)).toBe(true);
    });

    it('returns false when attribute type or value does not match', () => {
      expect(diagnosisHasMainAttribute([{ attributeType: MAIN_ATTR, value: false }], MAIN_ATTR)).toBe(false);
      expect(diagnosisHasMainAttribute([{ attributeType: 'other-uuid', value: true }], MAIN_ATTR)).toBe(false);
      expect(diagnosisHasMainAttribute(undefined, MAIN_ATTR)).toBe(false);
      expect(diagnosisHasMainAttribute([], MAIN_ATTR)).toBe(false);
      expect(diagnosisHasMainAttribute([{ attributeType: MAIN_ATTR, value: true }], '')).toBe(false);
    });
  });
});
