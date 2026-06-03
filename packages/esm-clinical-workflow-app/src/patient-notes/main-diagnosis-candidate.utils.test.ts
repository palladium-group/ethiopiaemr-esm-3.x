import { openmrsFetch } from '@openmrs/esm-framework';
import {
  getImmediateParentConceptUuid,
  isDiagnosisClassConcept,
  resolveMainDiagnosisCandidateForPrimary,
  resolveMainDiagnosisCandidatesForPrimaries,
  type ConceptForMainDiagnosisResolution,
} from './main-diagnosis-candidate.utils';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;

const ESV_SOURCE = 'esv-source-uuid';
const DIAGNOSIS_CLASS = 'diagnosis-class-uuid';

const options = {
  esvIcd11ConceptSourceUuid: ESV_SOURCE,
  diagnosisConceptClass: DIAGNOSIS_CLASS,
  maxParentHops: 10,
};

function concept(
  uuid: string,
  display: string,
  extra: Partial<ConceptForMainDiagnosisResolution> = {},
): ConceptForMainDiagnosisResolution {
  return { uuid, display, ...extra };
}

function esvMapping() {
  return {
    mappings: [{ conceptReferenceTerm: { conceptSource: { uuid: ESV_SOURCE } } }],
  };
}

describe('main-diagnosis-candidate.utils', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  describe('getImmediateParentConceptUuid', () => {
    it('returns first parent set concept uuid', () => {
      const c = concept('child', 'Child', {
        parentSets: [{ conceptSet: { uuid: 'parent-1', display: 'Parent' } }],
      });
      expect(getImmediateParentConceptUuid(c)).toBe('parent-1');
    });
  });

  describe('isDiagnosisClassConcept', () => {
    it('matches by concept class uuid', () => {
      expect(
        isDiagnosisClassConcept(concept('x', 'X', { conceptClass: { uuid: DIAGNOSIS_CLASS } }), DIAGNOSIS_CLASS),
      ).toBe(true);
    });

    it('falls back to diagnosis name', () => {
      expect(isDiagnosisClassConcept(concept('x', 'X', { conceptClass: { name: 'Diagnosis' } }), '')).toBe(true);
    });
  });

  describe('resolveMainDiagnosisCandidateForPrimary', () => {
    it('returns primary when it is mapped to ESV', async () => {
      mockedOpenmrsFetch.mockResolvedValueOnce({
        data: concept('primary-1', 'Primary One', esvMapping()),
      } as never);

      const result = await resolveMainDiagnosisCandidateForPrimary('primary-1', options);
      expect(result).toEqual({ uuid: 'primary-1', display: 'Primary One' });
      expect(mockedOpenmrsFetch).toHaveBeenCalledTimes(1);
    });

    it('walks parent chain until Diagnosis class with ESV mapping', async () => {
      mockedOpenmrsFetch
        .mockResolvedValueOnce({
          data: concept('symptom', 'Symptom', {
            parentSets: [{ conceptSet: { uuid: 'chapter', display: 'Chapter' } }],
          }),
        } as never)
        .mockResolvedValueOnce({
          data: concept('chapter', 'Chapter', {
            conceptClass: { uuid: 'other-class', name: 'Finding' },
            parentSets: [{ conceptSet: { uuid: 'dx', display: 'Diagnosis node' } }],
          }),
        } as never)
        .mockResolvedValueOnce({
          data: concept('dx', 'Diagnosis node', {
            conceptClass: { uuid: DIAGNOSIS_CLASS, name: 'Diagnosis' },
            ...esvMapping(),
          }),
        } as never);

      const result = await resolveMainDiagnosisCandidateForPrimary('symptom', options);
      expect(result).toEqual({ uuid: 'dx', display: 'Diagnosis node' });
    });

    it('continues past Diagnosis ancestor without ESV mapping', async () => {
      mockedOpenmrsFetch
        .mockResolvedValueOnce({
          data: concept('leaf', 'Leaf', {
            parentSets: [{ conceptSet: { uuid: 'dx-no-esv', display: 'Dx no ESV' } }],
          }),
        } as never)
        .mockResolvedValueOnce({
          data: concept('dx-no-esv', 'Dx no ESV', {
            conceptClass: { uuid: DIAGNOSIS_CLASS, name: 'Diagnosis' },
            mappings: [],
            parentSets: [{ conceptSet: { uuid: 'dx-esv', display: 'Dx ESV' } }],
          }),
        } as never)
        .mockResolvedValueOnce({
          data: concept('dx-esv', 'Dx ESV', {
            conceptClass: { uuid: DIAGNOSIS_CLASS, name: 'Diagnosis' },
            ...esvMapping(),
          }),
        } as never);

      const result = await resolveMainDiagnosisCandidateForPrimary('leaf', options);
      expect(result).toEqual({ uuid: 'dx-esv', display: 'Dx ESV' });
    });

    it('returns null when chain is exhausted without a match', async () => {
      mockedOpenmrsFetch.mockResolvedValueOnce({
        data: concept('orphan', 'Orphan', { parentSets: [] }),
      } as never);

      const result = await resolveMainDiagnosisCandidateForPrimary('orphan', options);
      expect(result).toBeNull();
    });
  });

  describe('resolveMainDiagnosisCandidatesForPrimaries', () => {
    it('dedupes and sorts candidates by display', async () => {
      mockedOpenmrsFetch
        .mockResolvedValueOnce({
          data: concept('p1', 'Zebra Dx', esvMapping()),
        } as never)
        .mockResolvedValueOnce({
          data: concept('p2', 'Alpha Dx', esvMapping()),
        } as never);

      const result = await resolveMainDiagnosisCandidatesForPrimaries(['p1', 'p2'], options);
      expect(result).toEqual([
        { uuid: 'p2', display: 'Alpha Dx' },
        { uuid: 'p1', display: 'Zebra Dx' },
      ]);
    });
  });
});
