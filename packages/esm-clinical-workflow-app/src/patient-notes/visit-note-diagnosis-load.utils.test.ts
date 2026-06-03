import { partitionEncounterDiagnosesForVisitNoteForm } from './visit-note-diagnosis-load.utils';

const MAIN_ATTR = 'main-attr-uuid';
const PATIENT = 'patient-uuid';

describe('partitionEncounterDiagnosesForVisitNoteForm', () => {
  it('returns empty lists when there are no rows', () => {
    const result = partitionEncounterDiagnosesForVisitNoteForm([], PATIENT, MAIN_ATTR);
    expect(result).toEqual({
      primaryDiagnoses: [],
      secondaryDiagnoses: [],
      mainDiagnosis: null,
      combinedDiagnoses: [],
    });
  });

  it('excludes main diagnosis from primary and secondary lists', () => {
    const result = partitionEncounterDiagnosesForVisitNoteForm(
      [
        {
          display: 'Primary A',
          rank: 1,
          certainty: 'CONFIRMED',
          diagnosis: { coded: { uuid: 'primary-a' } },
        },
        {
          display: 'Main Dx',
          rank: 1,
          certainty: 'CONFIRMED',
          diagnosis: { coded: { uuid: 'main-uuid' } },
          attributes: [{ attributeType: MAIN_ATTR, value: true }],
        },
        {
          display: 'Secondary B',
          rank: 2,
          certainty: 'PROVISIONAL',
          diagnosis: { coded: { uuid: 'secondary-b' } },
        },
      ],
      PATIENT,
      MAIN_ATTR,
    );

    expect(result.mainDiagnosis?.diagnosis.coded).toBe('main-uuid');
    expect(result.mainDiagnosis?.attributes).toEqual([{ attributeType: MAIN_ATTR, value: true }]);
    expect(result.primaryDiagnoses).toHaveLength(1);
    expect(result.primaryDiagnoses[0].diagnosis.coded).toBe('primary-a');
    expect(result.secondaryDiagnoses).toHaveLength(1);
    expect(result.secondaryDiagnoses[0].diagnosis.coded).toBe('secondary-b');
    expect(result.combinedDiagnoses.map((d) => d.diagnosis.coded)).toEqual(['primary-a', 'secondary-b', 'main-uuid']);
  });

  it('detects main when attributeType is an object', () => {
    const result = partitionEncounterDiagnosesForVisitNoteForm(
      [
        {
          display: 'Main Dx',
          rank: 1,
          diagnosis: { coded: { uuid: 'main-uuid' } },
          attributes: [{ attributeType: { uuid: MAIN_ATTR }, value: 'true' }],
        },
      ],
      PATIENT,
      MAIN_ATTR,
    );

    expect(result.mainDiagnosis?.diagnosis.coded).toBe('main-uuid');
    expect(result.primaryDiagnoses).toHaveLength(0);
  });

  it('ignores voided rows', () => {
    const result = partitionEncounterDiagnosesForVisitNoteForm(
      [
        {
          display: 'Voided',
          rank: 1,
          voided: true,
          diagnosis: { coded: { uuid: 'voided' } },
          attributes: [{ attributeType: MAIN_ATTR, value: true }],
        },
      ],
      PATIENT,
      MAIN_ATTR,
    );

    expect(result.mainDiagnosis).toBeNull();
    expect(result.combinedDiagnoses).toEqual([]);
  });
});
