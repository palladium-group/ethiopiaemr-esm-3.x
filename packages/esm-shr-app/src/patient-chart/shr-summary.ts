/** The IPS sections the SHR returns, by their LOINC code. */
export const SECTION_CODES: Record<string, ShrSectionKey> = {
  '11450-4': 'problems',
  '48765-2': 'allergies',
  '10160-0': 'medications',
  '46240-8': 'visits',
};

export type ShrSectionKey = 'problems' | 'allergies' | 'medications' | 'visits';

export const SECTION_ORDER: Array<ShrSectionKey> = ['problems', 'allergies', 'medications', 'visits'];

export interface ShrRecord {
  id: string;
  /** Null when the record carries no readable name. */
  name: string | null;
  date: string | null;
  status: string | null;
  detail: string | null;
  /** The facility that sent the record, from the Provenance covering it. */
  facility: string | null;
}

export type ShrSummary = Record<ShrSectionKey, Array<ShrRecord>>;

type Resource = { resourceType: string; id?: string; [key: string]: any };

interface BundleEntry {
  fullUrl?: string;
  resource?: Resource;
}

/**
 * The records in each section of an IPS document, as the chart shows them.
 *
 * A section the patient has not shared and one with nothing in it look the same: the SHR returns
 * both empty, so a reader cannot learn what exists. A section missing from the document is shown
 * empty too.
 */
export function parseSummary(bundle: { entry?: Array<BundleEntry> } | null | undefined): ShrSummary {
  const summary: ShrSummary = { problems: [], allergies: [], medications: [], visits: [] };
  const entries = bundle?.entry ?? [];

  const byReference = new Map<string, Resource>();
  const fullUrlOf = new Map<Resource, string>();
  for (const entry of entries) {
    const resource = entry.resource;
    if (!resource) {
      continue;
    }
    if (entry.fullUrl) {
      byReference.set(entry.fullUrl, resource);
      fullUrlOf.set(resource, entry.fullUrl);
    }
    if (resource.id) {
      byReference.set(`${resource.resourceType}/${resource.id}`, resource);
    }
  }

  const facilityByReference = new Map<string, string>();
  const namedReferences = new Set<string>();
  for (const entry of entries) {
    const provenance = entry.resource;
    if (provenance?.resourceType !== 'Provenance') {
      continue;
    }
    const who = provenance.agent?.[0]?.who;
    const named = who?.display?.trim() || null;
    const facility = named || who?.identifier?.value || null;
    if (!facility) {
      continue;
    }
    for (const target of provenance.target ?? []) {
      if (!target?.reference) {
        continue;
      }
      // A record sent more than once has several Provenances, and older ones may carry only the
      // MFR id; a name from any of them is kept over a bare id, whatever their order.
      const key = relativeReference(target.reference);
      if (named || !namedReferences.has(key)) {
        facilityByReference.set(key, facility);
      }
      if (named) {
        namedReferences.add(key);
      }
    }
  }

  const resolve = (reference: string | undefined) =>
    reference ? byReference.get(reference) ?? byReference.get(relativeReference(reference)) : undefined;

  // An assembled record (a MedicationStatement, say) is named by urn:uuid and was never stored,
  // so its Provenance covers the record it was derived from instead.
  const facilityOf = (resource: Resource, local: string | null) =>
    [fullUrlOf.get(resource), local, ...(resource.derivedFrom ?? []).map((from) => from?.reference)]
      .filter(Boolean)
      .map((reference) => facilityByReference.get(relativeReference(reference)))
      .find(Boolean) ?? null;

  const composition = entries.find((entry) => entry.resource?.resourceType === 'Composition')?.resource;
  for (const section of composition?.section ?? []) {
    const key = (section.code?.coding ?? []).map((coding) => SECTION_CODES[coding.code]).find(Boolean);
    if (!key) {
      continue;
    }
    if (key === 'visits') {
      summary.visits.push(...visitRecords(section.entry ?? [], resolve, facilityOf));
      continue;
    }
    for (const ref of section.entry ?? []) {
      const resource = resolve(ref?.reference);
      if (!resource) {
        continue;
      }
      const local = resource.id ? `${resource.resourceType}/${resource.id}` : null;
      summary[key].push(toRecord(resource, local ?? ref.reference, facilityOf(resource, local), resolve));
    }
  }
  return summary;
}

/**
 * One row per visit, its detail the diagnoses concluded on it. The Visits section lists the visits
 * and their diagnoses side by side; a diagnosis belongs to a visit when either names the other, in
 * Condition.encounter or Encounter.diagnosis. References are compared by the resource they resolve
 * to, so a record named only by urn:uuid is matched too.
 *
 * A diagnosis whose visit is not in the document gets a row of its own, so it is never dropped.
 */
function visitRecords(
  entries: Array<{ reference?: string }>,
  resolve: (reference: string | undefined) => Resource | undefined,
  facilityOf: (resource: Resource, local: string | null) => string | null,
): Array<ShrRecord> {
  // Each resource once, with the reference it was listed under to key its row when it has no id.
  const listed = new Map<Resource, string>();
  for (const ref of entries) {
    const resource = resolve(ref?.reference);
    if (resource && !listed.has(resource)) {
      listed.set(resource, ref.reference);
    }
  }
  const rowId = (resource: Resource) =>
    resource.id ? `${resource.resourceType}/${resource.id}` : listed.get(resource);
  const listedOf = (type: string) => [...listed.keys()].filter((resource) => resource.resourceType === type);
  const visits = listedOf('Encounter');
  const diagnoses = listedOf('Condition');
  const placed = new Set<Resource>();

  const records = visits.map((visit) => {
    const local = visit.id ? `Encounter/${visit.id}` : null;
    const named = (visit.diagnosis ?? []).map((entry) => ({
      diagnosis: resolve(entry?.condition?.reference),
      main: (entry?.use?.coding ?? []).some((coding) => coding?.code === 'main'),
    }));
    // The visit marks which of its diagnoses was the main one.
    const main = new Set(named.filter((entry) => entry.main).map((entry) => entry.diagnosis));
    const own = diagnoses.filter(
      (diagnosis) =>
        resolve(diagnosis.encounter?.reference) === visit || named.some((entry) => entry.diagnosis === diagnosis),
    );
    own.forEach((diagnosis) => placed.add(diagnosis));
    return {
      id: rowId(visit),
      name: joined((visit.type ?? []).map(codeText)) ?? codeText(visit.class) ?? visit.class?.code ?? null,
      date: visit.period?.start ?? null,
      status: null,
      detail: joined(own.map((diagnosis) => diagnosisText(diagnosis, main.has(diagnosis)))),
      facility: facilityOf(visit, local),
    };
  });

  for (const diagnosis of diagnoses.filter((d) => !placed.has(d))) {
    const local = diagnosis.id ? `Condition/${diagnosis.id}` : null;
    records.push({
      id: rowId(diagnosis),
      name: codeText(diagnosis.code),
      date: diagnosis.recordedDate ?? null,
      status: null,
      detail: diagnosisText(diagnosis, false),
      facility: facilityOf(diagnosis, local),
    });
  }
  return records;
}

/** "Malaria (main · Confirmed)": the diagnosis, whether it was the main one, and how certain it is. */
function diagnosisText(diagnosis: Resource, main: boolean): string | null {
  const name = codeText(diagnosis.code);
  if (!name) {
    return null;
  }
  const notes = [main ? 'main' : null, statusText(diagnosis.verificationStatus)].filter(Boolean);
  return notes.length ? `${name} (${notes.join(' · ')})` : name;
}

function toRecord(
  resource: Resource,
  id: string,
  facility: string | null,
  resolve: (reference: string | undefined) => Resource | undefined,
): ShrRecord {
  switch (resource.resourceType) {
    case 'Condition':
      return {
        id,
        name: codeText(resource.code),
        date: resource.onsetDateTime ?? resource.recordedDate ?? null,
        status: statusText(resource.clinicalStatus),
        detail: null,
        facility,
      };
    case 'AllergyIntolerance':
      return {
        id,
        name: codeText(resource.code),
        date: resource.recordedDate ?? resource.onsetDateTime ?? null,
        status: resource.criticality ?? null,
        detail: joined((resource.reaction ?? []).flatMap((reaction) => (reaction.manifestation ?? []).map(codeText))),
        facility,
      };
    case 'MedicationStatement':
    case 'MedicationRequest':
      return {
        id,
        name:
          codeText(resource.medicationCodeableConcept) ??
          codeText(resolve(resource.medicationReference?.reference)?.code) ??
          (resource.medicationReference?.display?.trim() || null),
        date:
          resource.effectiveDateTime ??
          resource.effectivePeriod?.start ??
          resource.dateAsserted ??
          resource.authoredOn ??
          null,
        status: resource.status ?? null,
        detail: joined((resource.dosage ?? resource.dosageInstruction ?? []).map((dosage) => dosage?.text)),
        facility,
      };
    default:
      return { id, name: codeText(resource.code), date: null, status: null, detail: null, facility };
  }
}

/**
 * A status such as Condition.clinicalStatus: its display, else its code. Unlike a clinical concept,
 * a status code is a fixed, readable FHIR value ("active"), so showing it is safe.
 */
export function statusText(
  concept: { text?: string; coding?: Array<{ system?: string; code?: string; display?: string }> } | undefined,
): string | null {
  const text = codeText(concept);
  if (text) {
    return text;
  }
  const code = concept?.coding?.find((coding) => coding?.code?.trim())?.code?.trim();
  return code ? code.charAt(0).toUpperCase() + code.slice(1) : null;
}

/** A CodeableConcept's text, else the first coding with a display. Never a bare code. */
export function codeText(concept: { text?: string; coding?: Array<{ display?: string }> } | undefined): string | null {
  if (!concept) {
    return null;
  }
  if (concept.text?.trim()) {
    return concept.text.trim();
  }
  const display = concept.coding?.find((coding) => coding?.display?.trim())?.display;
  return display ? display.trim() : null;
}

function joined(values: Array<string | null | undefined>): string | null {
  const present = values.filter((value): value is string => Boolean(value && value.trim()));
  return present.length ? present.join(', ') : null;
}

/** "https://host/fhir/Condition/12" and "Condition/12" both become "Condition/12". */
function relativeReference(reference: string): string {
  const parts = reference.split('/').filter(Boolean);
  return parts.length >= 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : reference;
}
