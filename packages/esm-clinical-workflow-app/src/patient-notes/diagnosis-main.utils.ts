export interface DiagnosisAttributeLike {
  uuid?: string;
  attributeType?: { uuid?: string; display?: string } | string;
  value?: unknown;
}

export interface DiagnosisWithAttributes {
  rank: number;
  display?: string;
  attributes?: ReadonlyArray<DiagnosisAttributeLike>;
}

export function diagnosisAttributeValueIsTrue(value: unknown): boolean {
  return value === true || value === 'true';
}

export function resolveDiagnosisAttributeTypeUuid(attributeType: unknown): string | undefined {
  if (typeof attributeType === 'string') {
    return attributeType;
  }
  if (attributeType && typeof attributeType === 'object' && 'uuid' in attributeType) {
    return (attributeType as { uuid?: string }).uuid;
  }
  return undefined;
}

export function diagnosisHasMainAttribute(
  attributes: ReadonlyArray<DiagnosisAttributeLike> | undefined,
  mainDiagnosisAttributeTypeUuid: string,
): boolean {
  if (!mainDiagnosisAttributeTypeUuid) {
    return false;
  }
  return (
    attributes?.some(
      (attr) =>
        resolveDiagnosisAttributeTypeUuid(attr.attributeType) === mainDiagnosisAttributeTypeUuid &&
        diagnosisAttributeValueIsTrue(attr.value),
    ) ?? false
  );
}

export function patientDiagnosisIsMain(
  diagnosis: DiagnosisWithAttributes,
  mainDiagnosisAttributeTypeUuid: string,
): boolean {
  return diagnosisHasMainAttribute(diagnosis.attributes, mainDiagnosisAttributeTypeUuid);
}
