import { resolveResultKind, type PathologyResultObservation } from './pathology-results.resource';

const obs = (resultKind: PathologyResultObservation['resultKind']): PathologyResultObservation => ({
  id: Math.random().toString(),
  issued: '',
  field: 'Field',
  conceptUuid: 'c',
  value: 'v',
  encounterUuid: 'e',
  encounterDisplay: '',
  encounterDatetime: '',
  resultKind,
});

describe('resolveResultKind', () => {
  it('labels an encounter of hematopathology fields as hematopathology', () => {
    expect(resolveResultKind([obs('hematopathology'), obs('hematopathology'), obs('pathology')])).toBe(
      'hematopathology',
    );
  });

  it('keeps cytology and pathology behaviour', () => {
    expect(resolveResultKind([obs('cytology'), obs('cytology'), obs('pathology')])).toBe('cytology');
    expect(resolveResultKind([obs('pathology'), obs('cytology')])).toBe('pathology');
    expect(resolveResultKind([])).toBe('pathology');
  });
});
