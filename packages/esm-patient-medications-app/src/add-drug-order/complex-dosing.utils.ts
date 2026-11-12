import type { DurationUnit } from '@openmrs/esm-patient-common-lib';
import { durationToDays } from './drug-order-form.resource';
import type {
  TaperingDosingState,
  TaperingPhase,
  TaperingPhaseFieldErrors,
  TaperingValidationErrors,
  TaperingValidationMessages,
  TaperingValidationResult,
  HybridDosingState,
  HybridPhase,
  HybridPhaseFieldErrors,
  HybridValidationErrors,
  HybridValidationMessages,
  HybridValidationResult,
  VariableDosingState,
  VariablePattern,
  VariableQ6hDoses,
  VariableSlotFieldErrors,
  VariableSlotKey,
  VariableTidDoses,
  VariableValidationErrors,
  VariableValidationMessages,
  VariableValidationResult,
} from './complex-dosing.types';

type PhaseDuration = { duration: number | null; durationUnit: DurationUnit | null };

export type {
  TaperingValidationErrors,
  TaperingValidationMessages,
  TaperingValidationResult,
  VariableValidationErrors,
  VariableValidationMessages,
  VariableValidationResult,
} from './complex-dosing.types';

export function calculateTaperingTotalDurationDays(
  phases: Array<PhaseDuration>,
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

function serializeVariableSlot(label: string, dose: number | null, unitValue: string): string | null {
  if (dose == null || dose <= 0) {
    return null;
  }

  const dosePart = unitValue ? `${dose} ${unitValue}` : `${dose}`;

  return `${label}: ${dosePart}`;
}

function getPatternSlots(
  pattern: VariablePattern,
  tidDoses: VariableTidDoses,
  q6hDoses: VariableQ6hDoses,
): Array<{ label: string; dose: number | null }> {
  if (pattern === 'tid') {
    return [
      { label: 'Morning', dose: tidDoses.morning },
      { label: 'Noon', dose: tidDoses.noon },
      { label: 'Evening', dose: tidDoses.evening },
    ];
  }

  return [
    { label: '06:00', dose: q6hDoses.at0600 },
    { label: '12:00', dose: q6hDoses.at1200 },
    { label: '18:00', dose: q6hDoses.at1800 },
    { label: '00:00', dose: q6hDoses.at0000 },
  ];
}

function serializePatternSlots(
  pattern: VariablePattern,
  tidDoses: VariableTidDoses,
  q6hDoses: VariableQ6hDoses,
  unitValue: string,
): Array<string> {
  const slotParts: Array<string> = [];

  for (const slot of getPatternSlots(pattern, tidDoses, q6hDoses)) {
    const slotString = serializeVariableSlot(slot.label, slot.dose, unitValue);
    if (slotString) {
      slotParts.push(slotString);
    }
  }

  return slotParts;
}

export function serializeVariableDosage(state: VariableDosingState): string | null {
  const unitValue = state.unit?.value ?? '';
  const patternLabel = state.pattern === 'tid' ? 'TID' : 'Q6H';
  const slotParts = serializePatternSlots(state.pattern, state.tidDoses, state.q6hDoses, unitValue);

  return slotParts.length > 0 ? `Pattern: ${patternLabel}, ${slotParts.join(', ')}` : null;
}

export function serializeHybridDosage(state: HybridDosingState): string | null {
  const unitValue = state.unit?.value ?? '';
  const phaseStrings: Array<string> = [];

  state.phases.forEach((phase, index) => {
    if (phase.duration == null || phase.duration <= 0 || !phase.durationUnit?.value) {
      return;
    }

    const slotParts = serializePatternSlots(phase.pattern, phase.tidDoses, phase.q6hDoses, unitValue);
    if (slotParts.length === 0) {
      return;
    }

    phaseStrings.push(`Phase ${index + 1} (${phase.duration} ${phase.durationUnit.value}): ${slotParts.join(', ')}`);
  });

  return phaseStrings.length > 0 ? phaseStrings.join('; ') : null;
}

function sumVariableSlotDoses(doses: Array<number | null>): number | null {
  let total = 0;

  for (const dose of doses) {
    if (dose == null || dose <= 0) {
      return null;
    }
    total += dose;
  }

  return total;
}

export function calculateVariableQuantity(
  state: VariableDosingState,
  duration: number | null,
  durationUnitValueCoded: string | null | undefined,
  durationUnitsDaysMap: Record<string, number>,
): number | null {
  const slotDoses =
    state.pattern === 'tid'
      ? [state.tidDoses.morning, state.tidDoses.noon, state.tidDoses.evening]
      : [state.q6hDoses.at0600, state.q6hDoses.at1200, state.q6hDoses.at1800, state.q6hDoses.at0000];

  const dailyTotal = sumVariableSlotDoses(slotDoses);
  if (dailyTotal == null) {
    return null;
  }

  if (duration == null || duration <= 0) {
    return null;
  }

  const durationDays = durationToDays(duration, durationUnitValueCoded ?? null, durationUnitsDaysMap);
  if (durationDays == null) {
    return null;
  }

  const result = Math.ceil(dailyTotal * durationDays);
  return result > 0 && isFinite(result) ? result : null;
}

export function calculateHybridQuantity(
  state: HybridDosingState,
  durationUnitsDaysMap: Record<string, number>,
): number | null {
  if (state.phases.length === 0) {
    return null;
  }

  let total = 0;
  for (const phase of state.phases) {
    if (phase.duration == null || phase.duration <= 0 || !phase.durationUnit?.valueCoded) {
      return null;
    }

    const slotDoses =
      phase.pattern === 'tid'
        ? [phase.tidDoses.morning, phase.tidDoses.noon, phase.tidDoses.evening]
        : [phase.q6hDoses.at0600, phase.q6hDoses.at1200, phase.q6hDoses.at1800, phase.q6hDoses.at0000];

    const dailyTotal = sumVariableSlotDoses(slotDoses);
    if (dailyTotal == null) {
      return null;
    }

    const phaseDays = durationToDays(phase.duration, phase.durationUnit.valueCoded, durationUnitsDaysMap);
    if (phaseDays == null) {
      return null;
    }

    total += dailyTotal * phaseDays;
  }

  const result = Math.ceil(total);
  return result > 0 && isFinite(result) ? result : null;
}

function validateVariableSlotDose(
  dose: number | null,
  messages: { doseRequired: string; doseGreaterThanZero: string },
): VariableSlotFieldErrors {
  const errors: VariableSlotFieldErrors = {};

  if (dose == null) {
    errors.dose = messages.doseRequired;
  } else if (dose <= 0) {
    errors.dose = messages.doseGreaterThanZero;
  }

  return errors;
}

function getActivePatternSlotKeys(pattern: VariablePattern): Array<VariableSlotKey> {
  if (pattern === 'tid') {
    return ['morning', 'noon', 'evening'];
  }

  return ['at0600', 'at1200', 'at1800', 'at0000'];
}

function getActiveVariableSlotKeys(state: VariableDosingState): Array<VariableSlotKey> {
  return getActivePatternSlotKeys(state.pattern);
}

function getSlotDoseFromDoses(
  tidDoses: VariableTidDoses,
  q6hDoses: VariableQ6hDoses,
  slotKey: VariableSlotKey,
): number | null {
  if (slotKey === 'morning' || slotKey === 'noon' || slotKey === 'evening') {
    return tidDoses[slotKey];
  }

  return q6hDoses[slotKey];
}

function getVariableSlotDose(state: VariableDosingState, slotKey: VariableSlotKey): number | null {
  return getSlotDoseFromDoses(state.tidDoses, state.q6hDoses, slotKey);
}

export function validateVariableDosing(
  state: VariableDosingState,
  duration: number | null,
  durationUnit: { valueCoded?: string | null } | null,
  messages: VariableValidationMessages,
): VariableValidationResult {
  const errors: VariableValidationErrors = { slots: {} };

  if (!state.route?.valueCoded) {
    errors.route = messages.routeRequired;
  }

  if (!state.unit?.valueCoded) {
    errors.unit = messages.unitRequired;
  }

  for (const slotKey of getActiveVariableSlotKeys(state)) {
    const slotErrors = validateVariableSlotDose(getVariableSlotDose(state, slotKey), messages);
    if (Object.keys(slotErrors).length > 0) {
      errors.slots[slotKey] = slotErrors;
    }
  }

  if (duration == null) {
    errors.duration = messages.durationRequired;
  } else if (duration <= 0) {
    errors.duration = messages.durationGreaterThanZero;
  }

  if (!durationUnit?.valueCoded) {
    errors.durationUnit = messages.durationUnitRequired;
  }

  const isValid =
    !errors.route && !errors.unit && !errors.duration && !errors.durationUnit && Object.keys(errors.slots).length === 0;

  return { isValid, errors };
}

function validateTaperingPhase(phase: TaperingPhase, messages: TaperingValidationMessages): TaperingPhaseFieldErrors {
  const errors: TaperingPhaseFieldErrors = {};

  if (phase.dose == null) {
    errors.dose = messages.doseRequired;
  } else if (phase.dose <= 0) {
    errors.dose = messages.doseGreaterThanZero;
  }

  if (!phase.frequency?.valueCoded) {
    errors.frequency = messages.frequencyRequired;
  }

  if (phase.duration == null) {
    errors.duration = messages.durationRequired;
  } else if (phase.duration <= 0) {
    errors.duration = messages.durationGreaterThanZero;
  }

  if (!phase.durationUnit?.valueCoded) {
    errors.durationUnit = messages.durationUnitRequired;
  }

  return errors;
}

export function validateTaperingDosing(
  state: TaperingDosingState,
  messages: TaperingValidationMessages,
): TaperingValidationResult {
  const errors: TaperingValidationErrors = { phases: {} };

  if (!state.route?.valueCoded) {
    errors.route = messages.routeRequired;
  }

  if (!state.unit?.valueCoded) {
    errors.unit = messages.unitRequired;
  }

  for (const phase of state.phases) {
    const phaseErrors = validateTaperingPhase(phase, messages);
    if (Object.keys(phaseErrors).length > 0) {
      errors.phases[phase.id] = phaseErrors;
    }
  }

  const isValid = !errors.route && !errors.unit && Object.keys(errors.phases).length === 0;

  return { isValid, errors };
}

function validateHybridPhase(phase: HybridPhase, messages: HybridValidationMessages): HybridPhaseFieldErrors {
  const errors: HybridPhaseFieldErrors = {};

  if (phase.duration == null) {
    errors.duration = messages.durationRequired;
  } else if (phase.duration <= 0) {
    errors.duration = messages.durationGreaterThanZero;
  }

  if (!phase.durationUnit?.valueCoded) {
    errors.durationUnit = messages.durationUnitRequired;
  }

  const slotErrors: Partial<Record<VariableSlotKey, VariableSlotFieldErrors>> = {};
  for (const slotKey of getActivePatternSlotKeys(phase.pattern)) {
    const dose = getSlotDoseFromDoses(phase.tidDoses, phase.q6hDoses, slotKey);
    const doseErrors = validateVariableSlotDose(dose, messages);
    if (Object.keys(doseErrors).length > 0) {
      slotErrors[slotKey] = doseErrors;
    }
  }

  if (Object.keys(slotErrors).length > 0) {
    errors.slots = slotErrors;
  }

  return errors;
}

export function validateHybridDosing(
  state: HybridDosingState,
  messages: HybridValidationMessages,
): HybridValidationResult {
  const errors: HybridValidationErrors = { phases: {} };

  if (!state.route?.valueCoded) {
    errors.route = messages.routeRequired;
  }

  if (!state.unit?.valueCoded) {
    errors.unit = messages.unitRequired;
  }

  for (const phase of state.phases) {
    const phaseErrors = validateHybridPhase(phase, messages);
    if (Object.keys(phaseErrors).length > 0) {
      errors.phases[phase.id] = phaseErrors;
    }
  }

  const isValid = !errors.route && !errors.unit && Object.keys(errors.phases).length === 0;

  return { isValid, errors };
}
