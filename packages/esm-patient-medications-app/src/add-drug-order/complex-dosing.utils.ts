import { durationToDays } from './drug-order-form.resource';
import type { TaperingDosingState, TaperingPhase } from './complex-dosing.types';

export function calculateTaperingTotalDurationDays(
  phases: Array<TaperingPhase>,
  durationUnitsDaysMap: Record<string, number>,
): number | null {
  if (phases.length === 0) {
    return null;
  }

  let total = 0;
  for (const phase of phases) {
    const phaseDays = durationToDays(phase.duration, phase.durationUnit?.valueCoded ?? null, durationUnitsDaysMap);
    if (phaseDays == null) {
      return null;
    }
    total += phaseDays;
  }

  return total;
}

export function calculateTaperingQuantity(
  state: TaperingDosingState,
  durationUnitsDaysMap: Record<string, number>,
): number | null {
  if (state.phases.length === 0) {
    return null;
  }

  let total = 0;
  for (const phase of state.phases) {
    if (
      phase.dose == null ||
      phase.dose <= 0 ||
      phase.frequency?.frequencyPerDay == null ||
      phase.frequency.frequencyPerDay <= 0 ||
      phase.duration == null ||
      phase.duration <= 0 ||
      !phase.durationUnit?.valueCoded
    ) {
      return null;
    }

    const phaseDays = durationToDays(phase.duration, phase.durationUnit.valueCoded, durationUnitsDaysMap);
    if (phaseDays == null) {
      return null;
    }

    total += phase.dose * phase.frequency.frequencyPerDay * phaseDays;
  }

  const result = Math.ceil(total);
  return result > 0 && isFinite(result) ? result : null;
}

export function serializeTaperingDosage(state: TaperingDosingState): string | null {
  const unitValue = state.unit?.value ?? '';
  const phaseStrings = state.phases
    .map((phase, index) => serializeTaperingPhase(phase, index + 1, unitValue))
    .filter((phaseString): phaseString is string => phaseString != null);

  return phaseStrings.length > 0 ? phaseStrings.join('; ') : null;
}

function serializeTaperingPhase(phase: TaperingPhase, phaseNumber: number, unitValue: string): string | null {
  if (
    phase.dose == null ||
    phase.dose <= 0 ||
    !phase.frequency?.value ||
    phase.duration == null ||
    phase.duration <= 0 ||
    !phase.durationUnit?.value
  ) {
    return null;
  }

  const dosePart = unitValue ? `${phase.dose}${unitValue}` : `${phase.dose}`;

  return `Phase ${phaseNumber}: ${dosePart}, ${phase.frequency.value}, ${phase.duration} ${phase.durationUnit.value}`;
}
