import {
  collectVisitPrimaryConceptUuids,
  visitHasMainDiagnosisOnOtherEncounter,
  type ActiveVisitWithEncounters,
} from './visit-main-diagnosis.resource';

const MAIN_ATTR = 'main-attr-uuid';

const visit: ActiveVisitWithEncounters = {
  uuid: 'visit-1',
  encounters: [
    {
      uuid: 'enc-a',
      diagnoses: [
        {
          rank: 1,
          voided: false,
          diagnosis: { coded: { uuid: 'primary-a' } },
        },
        {
          rank: 1,
          voided: true,
          diagnosis: { coded: { uuid: 'voided-primary' } },
        },
      ],
    },
    {
      uuid: 'enc-b',
      diagnoses: [
        {
          rank: 1,
          voided: false,
          diagnosis: { coded: { uuid: 'primary-b' } },
        },
        {
          rank: 2,
          voided: false,
          diagnosis: { coded: { uuid: 'secondary-b' } },
        },
        {
          rank: 1,
          voided: false,
          diagnosis: { coded: { uuid: 'main-concept' } },
          attributes: [{ attributeType: { uuid: MAIN_ATTR }, value: true }],
        },
      ],
    },
  ],
};

describe('visit-main-diagnosis.resource', () => {
  describe('collectVisitPrimaryConceptUuids', () => {
    it('collects non-voided rank-1 coded uuids across encounters', () => {
      expect(collectVisitPrimaryConceptUuids(visit).sort()).toEqual(['primary-a', 'primary-b', 'main-concept'].sort());
    });

    it('returns empty array for null visit', () => {
      expect(collectVisitPrimaryConceptUuids(null)).toEqual([]);
    });
  });

  describe('visitHasMainDiagnosisOnOtherEncounter', () => {
    it('returns true when another encounter has main diagnosis attribute', () => {
      expect(visitHasMainDiagnosisOnOtherEncounter(visit, 'enc-a', MAIN_ATTR)).toBe(true);
    });

    it('returns false when only current encounter has main', () => {
      expect(visitHasMainDiagnosisOnOtherEncounter(visit, 'enc-b', MAIN_ATTR)).toBe(false);
    });

    it('returns false when no main on visit', () => {
      const visitWithoutMain: ActiveVisitWithEncounters = {
        uuid: 'visit-2',
        encounters: [
          {
            uuid: 'enc-c',
            diagnoses: [{ rank: 1, voided: false, diagnosis: { coded: { uuid: 'p1' } } }],
          },
        ],
      };
      expect(visitHasMainDiagnosisOnOtherEncounter(visitWithoutMain, 'enc-c', MAIN_ATTR)).toBe(false);
    });
  });
});
