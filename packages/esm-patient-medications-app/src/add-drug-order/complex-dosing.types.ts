import type { DosingUnit, DurationUnit, MedicationFrequency, MedicationRoute } from '@openmrs/esm-patient-common-lib';

export type DosingType = 'standard' | 'tapering' | 'variable' | 'hybrid';

export const DOSING_TYPES: Array<DosingType> = ['standard', 'tapering', 'variable', 'hybrid'];

export type TaperingPhase = {
  id: string;
  dose: number | null;
  frequency: MedicationFrequency | null;
  duration: number | null;
  durationUnit: DurationUnit | null;
};

export type TaperingDosingState = {
  route: MedicationRoute | null;
  unit: DosingUnit | null;
  phases: Array<TaperingPhase>;
};

export type TaperingPhaseFieldErrors = {
  dose?: string;
  frequency?: string;
  duration?: string;
  durationUnit?: string;
};

export type TaperingValidationErrors = {
  route?: string;
  unit?: string;
  phases: Record<string, TaperingPhaseFieldErrors>;
};

export type TaperingValidationMessages = {
  routeRequired: string;
  unitRequired: string;
  doseRequired: string;
  doseGreaterThanZero: string;
  frequencyRequired: string;
  durationRequired: string;
  durationGreaterThanZero: string;
  durationUnitRequired: string;
};

export type TaperingValidationResult = {
  isValid: boolean;
  errors: TaperingValidationErrors;
};

export function createEmptyTaperingPhase(defaultDurationUnit?: DurationUnit | null): TaperingPhase {
  return {
    id: createTaperingPhaseId(),
    dose: null,
    frequency: null,
    duration: null,
    durationUnit: defaultDurationUnit ?? null,
  };
}

function createTaperingPhaseId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `tapering-phase-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createInitialTaperingState(defaultDurationUnit?: DurationUnit | null): TaperingDosingState {
  return {
    route: null,
    unit: null,
    phases: [createEmptyTaperingPhase(defaultDurationUnit)],
  };
}

export type VariablePattern = 'tid' | 'q6h';

export type VariableTidDoses = {
  morning: number | null;
  noon: number | null;
  evening: number | null;
};

export type VariableQ6hDoses = {
  at0600: number | null;
  at1200: number | null;
  at1800: number | null;
  at0000: number | null;
};

export type VariableDosingState = {
  route: MedicationRoute | null;
  unit: DosingUnit | null;
  pattern: VariablePattern;
  tidDoses: VariableTidDoses;
  q6hDoses: VariableQ6hDoses;
};

export function createInitialVariableState(): VariableDosingState {
  return {
    route: null,
    unit: null,
    pattern: 'tid',
    tidDoses: { morning: null, noon: null, evening: null },
    q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
  };
}

export type VariableSlotKey = keyof VariableTidDoses | keyof VariableQ6hDoses;

export type VariableSlotFieldErrors = {
  dose?: string;
};

export type VariableValidationErrors = {
  route?: string;
  unit?: string;
  slots: Partial<Record<VariableSlotKey, VariableSlotFieldErrors>>;
  duration?: string;
  durationUnit?: string;
};

export type VariableValidationMessages = {
  routeRequired: string;
  unitRequired: string;
  doseRequired: string;
  doseGreaterThanZero: string;
  durationRequired: string;
  durationGreaterThanZero: string;
  durationUnitRequired: string;
};

export type VariableValidationResult = {
  isValid: boolean;
  errors: VariableValidationErrors;
};
