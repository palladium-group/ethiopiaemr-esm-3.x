export function mrnLengthValidationMessage(expectedLength: number): string {
  return `Legacy MRN must be exactly ${expectedLength} digits`;
}

export function validateMrnNumber(value: string | undefined, expectedLength: number): string | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'Legacy MRN must contain only digits';
  }
  if (trimmed.length !== expectedLength) {
    return mrnLengthValidationMessage(expectedLength);
  }
  return undefined;
}
