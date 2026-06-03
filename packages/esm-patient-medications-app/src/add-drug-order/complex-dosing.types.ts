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
