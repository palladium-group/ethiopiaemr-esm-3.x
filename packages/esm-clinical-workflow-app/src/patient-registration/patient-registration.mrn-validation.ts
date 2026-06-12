export function mrnLengthValidationMessage(expectedLength: number): string {
  return `MRN must be exactly ${expectedLength} digits`;
}

export function validateMrnNumber(value: string | undefined, expectedLength: number): string | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'MRN must contain only digits';
  }
  if (trimmed.length !== expectedLength) {
    return mrnLengthValidationMessage(expectedLength);
  }
  return undefined;
}
