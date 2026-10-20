/** The IPS sections the SHR returns, by their LOINC code. */
export const SECTION_CODES: Record<string, ShrSectionKey> = {
  '11450-4': 'problems',
  '48765-2': 'allergies',
  '10160-0': 'medications',
};

export type ShrSectionKey = 'problems' | 'allergies' | 'medications';

export const SECTION_ORDER: Array<ShrSectionKey> = ['problems', 'allergies', 'medications'];

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
  const summary: ShrSummary = { problems: [], allergies: [], medications: [] };
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
  for (const entry of entries) {
    const provenance = entry.resource;
    if (provenance?.resourceType !== 'Provenance') {
      continue;
    }
    const who = provenance.agent?.[0]?.who;
    const facility = who?.display || who?.identifier?.value || null;
    if (!facility) {
      continue;
    }
    for (const target of provenance.target ?? []) {
      if (target?.reference) {
        facilityByReference.set(relativeReference(target.reference), facility);
      }
    }
  }

  const resolve = (reference: string | undefined) =>
    reference ? byReference.get(reference) ?? byReference.get(relativeReference(reference)) : undefined;

  const composition = entries.find((entry) => entry.resource?.resourceType === 'Composition')?.resource;
  for (const section of composition?.section ?? []) {
    const key = (section.code?.coding ?? []).map((coding) => SECTION_CODES[coding.code]).find(Boolean);
    if (!key) {
      continue;
    }
    for (const ref of section.entry ?? []) {
      const resource = resolve(ref?.reference);
      if (!resource) {
        continue;
      }
      const local = resource.id ? `${resource.resourceType}/${resource.id}` : null;
      // An assembled record (a MedicationStatement, say) is named by urn:uuid and was never stored,
      // so its Provenance covers the record it was derived from instead.
      const facility =
        [fullUrlOf.get(resource), local, ...(resource.derivedFrom ?? []).map((from) => from?.reference)]
          .filter(Boolean)
          .map((reference) => facilityByReference.get(relativeReference(reference)))
          .find(Boolean) ?? null;
      summary[key].push(toRecord(resource, local ?? ref.reference, facility, resolve));
    }
  }
  return summary;
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
        status: codeText(resource.clinicalStatus),
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
