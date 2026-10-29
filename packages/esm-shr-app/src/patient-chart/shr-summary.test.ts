import { codeText, parseSummary, statusText } from './shr-summary';

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

  it('prefers a Provenance that names the facility over one with only its MFR id, in either order', () => {
    const withProvenances = (first: object, second: object) =>
      parseSummary({
        entry: [
          {
            resource: {
              resourceType: 'Composition',
              section: [{ code: { coding: [{ code: '11450-4' }] }, entry: [{ reference: 'Condition/10' }] }],
            },
          },
          { resource: { resourceType: 'Condition', id: '10', code: { text: 'Obesity' } } },
          { resource: { resourceType: 'Provenance', target: [{ reference: 'Condition/10' }], agent: [first] } },
          { resource: { resourceType: 'Provenance', target: [{ reference: 'Condition/10' }], agent: [second] } },
        ],
      }).problems[0].facility;
    const idOnly = { who: { identifier: FACILITY } };
    const named = { who: { identifier: FACILITY, display: 'Geda Health Center' } };

    expect(withProvenances(idOnly, named)).toBe('Geda Health Center');
    expect(withProvenances(named, idOnly)).toBe('Geda Health Center');
  });

  it('shows every section empty when the document has nothing in it', () => {
    const empty = { problems: [], allergies: [], medications: [], visits: [] };
    expect(parseSummary({ entry: [] })).toEqual(empty);
    expect(parseSummary(null)).toEqual(empty);
  });

  describe('visits', () => {
    const diagnosis = (id: string, name: string, verification: string, encounter?: string) => ({
      resource: {
        resourceType: 'Condition',
        id,
        code: { text: name },
        category: [{ coding: [{ code: 'encounter-diagnosis' }] }],
        verificationStatus: { coding: [{ code: verification }] },
        ...(encounter ? { encounter: { reference: encounter } } : {}),
        recordedDate: '2026-10-29T07:40:00Z',
      },
    });
    const visitsDocument = (entries: Array<object>, listed: Array<string>) => ({
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            section: [{ code: { coding: [{ code: '46240-8' }] }, entry: listed.map((reference) => ({ reference })) }],
          },
        },
        ...entries,
      ],
    });

    it('shows each visit with the diagnoses concluded on it, the main one marked', () => {
      const summary = parseSummary(
        visitsDocument(
          [
            {
              resource: {
                resourceType: 'Encounter',
                id: '1527',
                type: [{ text: 'Outpatient' }],
                period: { start: '2026-10-29T07:36:00Z' },
                diagnosis: [
                  { condition: { reference: 'Condition/1530' }, rank: 1 },
                  { condition: { reference: 'Condition/1531' }, use: { coding: [{ code: 'main' }] }, rank: 1 },
                ],
              },
            },
            diagnosis('1530', 'Amelogenesis imperfecta', 'provisional', 'Encounter/1527'),
            diagnosis('1531', 'Dental anomaly', 'confirmed', 'https://shr/fhir/Encounter/1527'),
            {
              resource: {
                resourceType: 'Provenance',
                target: [{ reference: 'Encounter/1527' }],
                agent: [{ who: { identifier: FACILITY, display: 'Geda Health Center' } }],
              },
            },
          ],
          ['Encounter/1527', 'Condition/1530', 'Condition/1531'],
        ),
      );

      expect(summary.problems).toEqual([]);
      expect(summary.visits).toEqual([
        {
          id: 'Encounter/1527',
          name: 'Outpatient',
          date: '2026-10-29T07:36:00Z',
          status: null,
          detail: 'Amelogenesis imperfecta (Provisional), Dental anomaly (main · Confirmed)',
          facility: 'Geda Health Center',
        },
      ]);
    });

    it('lists a visit with no diagnosis recorded', () => {
      const summary = parseSummary(
        visitsDocument(
          [{ resource: { resourceType: 'Encounter', id: '480', type: [{ text: 'Inpatient' }] } }],
          ['Encounter/480'],
        ),
      );

      expect(summary.visits).toMatchObject([{ id: 'Encounter/480', name: 'Inpatient', detail: null }]);
    });

    it('keeps a diagnosis whose visit is not in the document, on a row of its own', () => {
      const summary = parseSummary(visitsDocument([diagnosis('600', 'Malaria', 'confirmed')], ['Condition/600']));

      expect(summary.visits).toMatchObject([{ id: 'Condition/600', name: 'Malaria', detail: 'Malaria (Confirmed)' }]);
    });

    it('matches a visit and its diagnoses named only by urn:uuid', () => {
      const summary = parseSummary(
        visitsDocument(
          [
            {
              fullUrl: 'urn:uuid:visit',
              resource: {
                resourceType: 'Encounter',
                type: [{ text: 'Outpatient' }],
                diagnosis: [{ condition: { reference: 'urn:uuid:dx' }, use: { coding: [{ code: 'main' }] } }],
              },
            },
            {
              fullUrl: 'urn:uuid:dx',
              resource: {
                resourceType: 'Condition',
                code: { text: 'Malaria' },
                verificationStatus: { coding: [{ code: 'confirmed' }] },
                encounter: { reference: 'urn:uuid:visit' },
              },
            },
          ],
          ['urn:uuid:visit', 'urn:uuid:dx'],
        ),
      );

      expect(summary.visits).toMatchObject([
        { id: 'urn:uuid:visit', name: 'Outpatient', detail: 'Malaria (main · Confirmed)' },
      ]);
    });

    it('places a diagnosis the visit names even when the diagnosis does not name the visit', () => {
      const summary = parseSummary(
        visitsDocument(
          [
            {
              resource: {
                resourceType: 'Encounter',
                id: '1527',
                type: [{ text: 'Outpatient' }],
                diagnosis: [{ condition: { reference: 'Condition/1530' } }],
              },
            },
            diagnosis('1530', 'Malaria', 'confirmed'),
          ],
          ['Encounter/1527', 'Condition/1530'],
        ),
      );

      expect(summary.visits).toMatchObject([{ id: 'Encounter/1527', detail: 'Malaria (Confirmed)' }]);
    });

    it('shows a visit listed twice once', () => {
      const summary = parseSummary(
        visitsDocument(
          [{ resource: { resourceType: 'Encounter', id: '480', type: [{ text: 'Inpatient' }] } }],
          ['Encounter/480', 'Encounter/480'],
        ),
      );

      expect(summary.visits).toHaveLength(1);
    });
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

describe('statusText', () => {
  it('shows a status code when it has no display, but prefers the display', () => {
    const system = 'http://terminology.hl7.org/CodeSystem/condition-clinical';
    expect(statusText({ coding: [{ system, code: 'active' }] })).toBe('Active');
    expect(statusText({ coding: [{ system, code: 'resolved', display: 'Resolved' }] })).toBe('Resolved');
    expect(statusText(undefined)).toBeNull();
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
