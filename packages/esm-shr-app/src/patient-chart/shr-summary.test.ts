import { codeText, parseSummary } from './shr-summary';

const FACILITY = { system: 'https://fhir.moh.gov.et/sid/mfr-facility-id', value: '1048907' };

const bundle = {
  resourceType: 'Bundle',
  type: 'document',
  entry: [
    {
      fullUrl: 'urn:uuid:composition',
      resource: {
        resourceType: 'Composition',
        section: [
          {
            code: { coding: [{ system: 'http://loinc.org', code: '11450-4' }] },
            entry: [{ reference: 'Condition/10' }, { reference: 'https://shr/fhir/Condition/11' }],
          },
          {
            code: { coding: [{ system: 'http://loinc.org', code: '48765-2' }] },
            entry: [{ reference: 'AllergyIntolerance/20' }],
          },
          { code: { coding: [{ system: 'http://loinc.org', code: '10160-0' }] } },
        ],
      },
    },
    {
      resource: {
        resourceType: 'Condition',
        id: '10',
        code: { text: 'Hypertension' },
        clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
        onsetDateTime: '2026-09-25',
      },
    },
    {
      resource: {
        resourceType: 'Condition',
        id: '11',
        code: { coding: [{ code: 'a1b2c3d4-uuid' }] },
        recordedDate: '2026-09-26T08:00:00Z',
      },
    },
    {
      resource: {
        resourceType: 'AllergyIntolerance',
        id: '20',
        code: { coding: [{ display: 'Penicillin' }] },
        criticality: 'high',
        reaction: [{ manifestation: [{ text: 'Rash' }, { coding: [{ display: 'Hives' }] }] }],
      },
    },
    {
      resource: {
        resourceType: 'Provenance',
        target: [{ reference: 'Condition/10' }, { reference: 'AllergyIntolerance/20' }],
        agent: [{ who: { identifier: FACILITY, display: 'Geda Health Center' } }],
      },
    },
    {
      resource: {
        resourceType: 'Provenance',
        target: [{ reference: 'Condition/11' }],
        agent: [{ who: { identifier: FACILITY } }],
      },
    },
  ],
};

describe('parseSummary', () => {
  it('places each record in the section the document lists it under', () => {
    const summary = parseSummary(bundle);
    expect(summary.problems.map((record) => record.id)).toEqual(['Condition/10', 'Condition/11']);
    expect(summary.allergies.map((record) => record.id)).toEqual(['AllergyIntolerance/20']);
    expect(summary.medications).toEqual([]);
  });

  it('reads the name, date, status and detail of each record', () => {
    const [hypertension] = parseSummary(bundle).problems;
    expect(hypertension).toMatchObject({ name: 'Hypertension', date: '2026-09-25', status: 'Active' });

    const [penicillin] = parseSummary(bundle).allergies;
    expect(penicillin).toMatchObject({ name: 'Penicillin', status: 'high', detail: 'Rash, Hives' });
  });

  it('never shows a bare code as a name', () => {
    expect(parseSummary(bundle).problems[1].name).toBeNull();
  });

  it('names the facility that shared each record, by name or else by MFR id', () => {
    const summary = parseSummary(bundle);
    expect(summary.problems[0].facility).toBe('Geda Health Center');
    expect(summary.problems[1].facility).toBe('1048907');
  });

  it('shows every section empty when the document has nothing in it', () => {
    expect(parseSummary({ entry: [] })).toEqual({ problems: [], allergies: [], medications: [] });
    expect(parseSummary(null)).toEqual({ problems: [], allergies: [], medications: [] });
  });

  it('reads medications from either a statement or a request', () => {
    const summary = parseSummary({
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            section: [
              {
                code: { coding: [{ code: '10160-0' }] },
                entry: [{ reference: 'MedicationStatement/1' }, { reference: 'MedicationRequest/2' }],
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'MedicationStatement',
            id: '1',
            status: 'active',
            medicationCodeableConcept: { text: 'Amlodipine 5mg' },
            effectivePeriod: { start: '2026-09-25' },
            dosage: [{ text: 'once daily' }],
          },
        },
        {
          resource: {
            resourceType: 'MedicationRequest',
            id: '2',
            medicationCodeableConcept: { text: 'Metformin' },
            authoredOn: '2026-09-27',
          },
        },
      ],
    });
    expect(summary.medications).toEqual([
      expect.objectContaining({ name: 'Amlodipine 5mg', date: '2026-09-25', status: 'active', detail: 'once daily' }),
      expect.objectContaining({ name: 'Metformin', date: '2026-09-27' }),
    ]);
  });

  it('names a medication given by reference, from the bundled Medication or the display', () => {
    const summary = parseSummary({
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            section: [
              {
                code: { coding: [{ code: '10160-0' }] },
                entry: [{ reference: 'MedicationStatement/1' }, { reference: 'MedicationStatement/2' }],
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'MedicationStatement',
            id: '1',
            medicationReference: { reference: 'Medication/5' },
          },
        },
        { resource: { resourceType: 'Medication', id: '5', code: { text: 'Amlodipine 5mg' } } },
        {
          resource: {
            resourceType: 'MedicationStatement',
            id: '2',
            medicationReference: { reference: 'Medication/6', display: 'Metformin' },
          },
        },
      ],
    });
    expect(summary.medications.map((record) => record.name)).toEqual(['Amlodipine 5mg', 'Metformin']);
  });

  it('attributes a statement named by urn:uuid through the order it was derived from', () => {
    // As the SHR read facade assembles it: the statement was never stored, so Provenance covers the order.
    const summary = parseSummary({
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            section: [{ code: { coding: [{ code: '10160-0' }] }, entry: [{ reference: 'urn:uuid:statement' }] }],
          },
        },
        {
          fullUrl: 'urn:uuid:statement',
          resource: {
            resourceType: 'MedicationStatement',
            id: '7',
            medicationCodeableConcept: { text: 'Amlodipine 5mg' },
            derivedFrom: [{ reference: 'https://shr/fhir/MedicationRequest/7' }],
          },
        },
        {
          resource: {
            resourceType: 'Provenance',
            target: [{ reference: 'MedicationRequest/7' }],
            agent: [{ who: { display: 'Geda Health Center' } }],
          },
        },
      ],
    });
    expect(summary.medications[0].facility).toBe('Geda Health Center');
  });

  it('keys and attributes records without an id by their fullUrl', () => {
    const summary = parseSummary({
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            section: [
              {
                code: { coding: [{ code: '11450-4' }] },
                entry: [{ reference: 'urn:uuid:a' }, { reference: 'urn:uuid:b' }],
              },
            ],
          },
        },
        { fullUrl: 'urn:uuid:a', resource: { resourceType: 'Condition', code: { text: 'Asthma' } } },
        { fullUrl: 'urn:uuid:b', resource: { resourceType: 'Condition', code: { text: 'Hypertension' } } },
        {
          resource: {
            resourceType: 'Provenance',
            target: [{ reference: 'urn:uuid:a' }],
            agent: [{ who: { display: 'Geda Health Center' } }],
          },
        },
      ],
    });
    expect(summary.problems.map((record) => record.id)).toEqual(['urn:uuid:a', 'urn:uuid:b']);
    expect(summary.problems[0].facility).toBe('Geda Health Center');
  });
});

describe('codeText', () => {
  it('prefers text, then the first coding with a display', () => {
    expect(codeText({ text: ' Asthma ', coding: [{ display: 'Other' }] })).toBe('Asthma');
    expect(codeText({ coding: [{}, { display: 'Asthma' }] })).toBe('Asthma');
    expect(codeText({ coding: [{}] })).toBeNull();
    expect(codeText(undefined)).toBeNull();
  });
});
