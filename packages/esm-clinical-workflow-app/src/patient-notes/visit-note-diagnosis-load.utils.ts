import { diagnosisHasMainAttribute, resolveDiagnosisAttributeTypeUuid } from './diagnosis-main.utils';
import type { Diagnosis } from './types';

/** Encounter diagnosis row as returned by REST (chart / diagnoses dashboard). */
export interface EncounterDiagnosisLoadRow {
  voided?: boolean;
  display: string;
  certainty?: string;
  rank?: number;
  diagnosis?: { coded?: { uuid?: string } };
  attributes?: ReadonlyArray<{
    uuid?: string;
    attributeType?: { uuid?: string; display?: string } | string;
    value?: unknown;
  }>;
}

function mapEncounterAttributesToDiagnosisAttributes(
  attributes: EncounterDiagnosisLoadRow['attributes'],
): Diagnosis['attributes'] | undefined {
  if (!attributes?.length) {
    return undefined;
  }
  const out: NonNullable<Diagnosis['attributes']> = [];
  for (const a of attributes) {
    const typeUuid = resolveDiagnosisAttributeTypeUuid(a.attributeType);
    if (!typeUuid) {
      continue;
    }
    out.push({
      uuid: a.uuid,
      attributeType: typeUuid,
      value: a.value as boolean | string,
    });
  }
  return out.length ? out : undefined;
}

export interface PartitionedEncounterDiagnoses {
  primaryDiagnoses: Array<Diagnosis>;
  secondaryDiagnoses: Array<Diagnosis>;
  mainDiagnosis: Diagnosis | null;
  combinedDiagnoses: Array<Diagnosis>;
}

/** Splits non-voided encounter diagnoses for visit note edit; main is excluded from primary/secondary lists. */
export function partitionEncounterDiagnosesForVisitNoteForm(
  rows: ReadonlyArray<EncounterDiagnosisLoadRow>,
  patientUuid: string,
  mainDiagnosisAttributeTypeUuid: string,
): PartitionedEncounterDiagnoses {
  const activeRows = rows.filter((d) => !d.voided);

  if (!activeRows.length) {
    return {
      primaryDiagnoses: [],
      secondaryDiagnoses: [],
      mainDiagnosis: null,
      combinedDiagnoses: [],
    };
  }

  const mainEncounterRow = activeRows.find((d) =>
    diagnosisHasMainAttribute(d.attributes, mainDiagnosisAttributeTypeUuid),
  );
  const mainCodedUuid = mainEncounterRow?.diagnosis?.coded?.uuid;

  const transformedDiagnoses: Diagnosis[] = activeRows.map((d) => {
    const codedUuid = d.diagnosis?.coded?.uuid;
    const mappedAttributes = mapEncounterAttributesToDiagnosisAttributes(d.attributes);

    return {
      patient: patientUuid,
      diagnosis: {
        coded: codedUuid,
      },
      certainty: d.certainty,
      rank: d.rank,
      display: d.display,
      ...(mappedAttributes?.length ? { attributes: mappedAttributes } : {}),
    };
  });

  const mainDiagnosis =
    mainCodedUuid !== undefined ? transformedDiagnoses.find((d) => d.diagnosis.coded === mainCodedUuid) ?? null : null;

  const primaryDiagnoses = transformedDiagnoses.filter(
    (d) => d.rank === 1 && (!mainDiagnosis || d.diagnosis.coded !== mainDiagnosis.diagnosis.coded),
  );
  const secondaryDiagnoses = transformedDiagnoses.filter(
    (d) => d.rank === 2 && (!mainDiagnosis || d.diagnosis.coded !== mainDiagnosis.diagnosis.coded),
  );

  return {
    primaryDiagnoses,
    secondaryDiagnoses,
    mainDiagnosis,
    combinedDiagnoses: [...primaryDiagnoses, ...secondaryDiagnoses, ...(mainDiagnosis ? [mainDiagnosis] : [])],
  };
}
