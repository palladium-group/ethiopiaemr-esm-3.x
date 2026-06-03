import {
  calculateTaperingQuantity,
  calculateTaperingTotalDurationDays,
  calculateHybridQuantity,
  calculateVariableQuantity,
  serializeHybridDosage,
  serializeTaperingDosage,
  serializeVariableDosage,
  validateHybridDosing,
  validateTaperingDosing,
  validateVariableDosing,
} from './complex-dosing.utils';
import type {
  HybridDosingState,
  TaperingDosingState,
  TaperingPhase,
  TaperingValidationMessages,
  VariableDosingState,
  VariableValidationMessages,
} from './complex-dosing.types';

const durationUnitsDaysMap = {
  '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1,
  '1073AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 7,
};

const validationMessages: TaperingValidationMessages = {
  routeRequired: 'Route is required',
  unitRequired: 'Dose unit is required',
  doseRequired: 'Dosage is required',
  doseGreaterThanZero: 'Dose must be greater than 0',
  frequencyRequired: 'Frequency is required',
  durationRequired: 'Duration is required',
  durationGreaterThanZero: 'Duration must be greater than 0',
  durationUnitRequired: 'Duration unit is required',
};

const variableValidationMessages: VariableValidationMessages = {
  routeRequired: 'Route is required',
  unitRequired: 'Dose unit is required',
  doseRequired: 'Dosage is required',
  doseGreaterThanZero: 'Dose must be greater than 0',
  durationRequired: 'Duration is required',
  durationGreaterThanZero: 'Duration must be greater than 0',
  durationUnitRequired: 'Duration unit is required',
};

function createPhase(overrides: Partial<TaperingPhase>): TaperingPhase {
  return {
    id: 'phase-1',
    dose: null,
    frequency: null,
    duration: null,
    durationUnit: null,
    ...overrides,
  };
}

describe('calculateTaperingTotalDurationDays', () => {
  it('returns null when no phases are provided', () => {
    expect(calculateTaperingTotalDurationDays([], durationUnitsDaysMap)).toBeNull();
  });

  it('returns null when a phase duration is incomplete', () => {
    const phases = [
      createPhase({
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      }),
      createPhase({ duration: 7, durationUnit: null }),
    ];

    expect(calculateTaperingTotalDurationDays(phases, durationUnitsDaysMap)).toBeNull();
  });

  it('sums phase durations converted to days', () => {
    const phases = [
      createPhase({
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      }),
      createPhase({
        duration: 1,
        durationUnit: { valueCoded: '1073AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Weeks' },
      }),
    ];

    expect(calculateTaperingTotalDurationDays(phases, durationUnitsDaysMap)).toBe(14);
  });
});

describe('calculateTaperingQuantity', () => {
  it('returns null when a phase is incomplete', () => {
    const phases = [
      createPhase({
        dose: 40,
        frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      }),
      createPhase({ id: 'phase-2', dose: 20 }),
    ];

    expect(calculateTaperingQuantity({ route: null, unit: null, phases }, durationUnitsDaysMap)).toBeNull();
  });

  it('calculates quantity for a single complete phase', () => {
    expect(
      calculateTaperingQuantity(
        {
          route: null,
          unit: null,
          phases: [
            createPhase({
              dose: 40,
              frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
              duration: 7,
              durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
            }),
          ],
        },
        durationUnitsDaysMap,
      ),
    ).toBe(280);
  });

  it('sums quantity across multiple complete phases', () => {
    expect(
      calculateTaperingQuantity(
        {
          route: null,
          unit: null,
          phases: [
            createPhase({
              dose: 40,
              frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
              duration: 7,
              durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
            }),
            createPhase({
              id: 'phase-2',
              dose: 20,
              frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
              duration: 7,
              durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
            }),
          ],
        },
        durationUnitsDaysMap,
      ),
    ).toBe(420);
  });

  it('uses frequencyPerDay and weekly duration units', () => {
    expect(
      calculateTaperingQuantity(
        {
          route: null,
          unit: null,
          phases: [
            createPhase({
              dose: 10,
              frequency: { valueCoded: 'twice-daily-uuid', value: 'Twice daily', frequencyPerDay: 2 },
              duration: 1,
              durationUnit: { valueCoded: '1073AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Weeks' },
            }),
          ],
        },
        durationUnitsDaysMap,
      ),
    ).toBe(140);
  });
});

describe('serializeTaperingDosage', () => {
  const taperingState: TaperingDosingState = {
    route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
    unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'mg' },
    phases: [
      createPhase({
        dose: 40,
        frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      }),
      createPhase({
        id: 'phase-2',
        dose: 20,
        frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      }),
    ],
  };

  it('serializes complete tapering phases into freeTextDosage format', () => {
    expect(serializeTaperingDosage(taperingState)).toBe(
      'Phase 1: 40mg, Once daily, 7 Days; Phase 2: 20mg, Once daily, 7 Days',
    );
  });

  it('returns null when no phase is complete', () => {
    expect(
      serializeTaperingDosage({
        route: null,
        unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'mg' },
        phases: [createPhase({ dose: 40 })],
      }),
    ).toBeNull();
  });

  it('skips incomplete phases and serializes only complete ones', () => {
    expect(
      serializeTaperingDosage({
        ...taperingState,
        phases: [
          taperingState.phases[0],
          createPhase({
            id: 'phase-2',
            dose: 20,
          }),
        ],
      }),
    ).toBe('Phase 1: 40mg, Once daily, 7 Days');
  });
});

describe('calculateVariableQuantity', () => {
  const tidState = {
    route: null,
    unit: null,
    pattern: 'tid' as const,
    tidDoses: { morning: 12, noon: 8, evening: 10 },
    q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
  };

  it('returns null when a TID slot is incomplete', () => {
    expect(
      calculateVariableQuantity(
        { ...tidState, tidDoses: { morning: 12, noon: null, evening: 10 } },
        30,
        '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        durationUnitsDaysMap,
      ),
    ).toBeNull();
  });

  it('returns null when duration is incomplete', () => {
    expect(
      calculateVariableQuantity(tidState, null, '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', durationUnitsDaysMap),
    ).toBeNull();
  });

  it('calculates quantity as sum of daily doses times duration in days', () => {
    expect(calculateVariableQuantity(tidState, 30, '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', durationUnitsDaysMap)).toBe(
      900,
    );
  });

  it('calculates quantity for Q6H using all four slots', () => {
    expect(
      calculateVariableQuantity(
        {
          route: null,
          unit: null,
          pattern: 'q6h',
          tidDoses: { morning: null, noon: null, evening: null },
          q6hDoses: { at0600: 10, at1200: 10, at1800: 10, at0000: 5 },
        },
        7,
        '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        durationUnitsDaysMap,
      ),
    ).toBe(245);
  });
});

describe('serializeVariableDosage', () => {
  const tidState: VariableDosingState = {
    route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Subcutaneous' },
    unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Units' },
    pattern: 'tid',
    tidDoses: { morning: 12, noon: 8, evening: 10 },
    q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
  };

  it('serializes TID slots into freeTextDosage format', () => {
    expect(serializeVariableDosage(tidState)).toBe('Pattern: TID, Morning: 12 Units, Noon: 8 Units, Evening: 10 Units');
  });

  it('serializes Q6H slots into freeTextDosage format', () => {
    expect(
      serializeVariableDosage({
        ...tidState,
        pattern: 'q6h',
        q6hDoses: { at0600: 10, at1200: 10, at1800: 10, at0000: 5 },
      }),
    ).toBe('Pattern: Q6H, 06:00: 10 Units, 12:00: 10 Units, 18:00: 10 Units, 00:00: 5 Units');
  });

  it('returns null when no slot has a valid dose', () => {
    expect(
      serializeVariableDosage({
        ...tidState,
        tidDoses: { morning: null, noon: null, evening: null },
      }),
    ).toBeNull();
  });

  it('skips incomplete slots and serializes only complete ones', () => {
    expect(
      serializeVariableDosage({
        ...tidState,
        tidDoses: { morning: 12, noon: null, evening: 10 },
      }),
    ).toBe('Pattern: TID, Morning: 12 Units, Evening: 10 Units');
  });
});

describe('validateVariableDosing', () => {
  const validState: VariableDosingState = {
    route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
    unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
    pattern: 'tid',
    tidDoses: { morning: 12, noon: 8, evening: 10 },
    q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
  };

  const durationUnit = { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' };

  it('returns valid for a complete variable TID regimen', () => {
    expect(validateVariableDosing(validState, 30, durationUnit, variableValidationMessages).isValid).toBe(true);
  });

  it('requires route, dose unit, all TID slots, and duration', () => {
    const result = validateVariableDosing(
      {
        ...validState,
        route: null,
        unit: null,
        tidDoses: { morning: 12, noon: null, evening: 10 },
      },
      null,
      null,
      variableValidationMessages,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.route).toBe('Route is required');
    expect(result.errors.unit).toBe('Dose unit is required');
    expect(result.errors.slots.noon?.dose).toBe('Dosage is required');
    expect(result.errors.duration).toBe('Duration is required');
    expect(result.errors.durationUnit).toBe('Duration unit is required');
  });

  it('validates all Q6H slots when pattern is q6h', () => {
    const result = validateVariableDosing(
      {
        ...validState,
        pattern: 'q6h',
        q6hDoses: { at0600: 10, at1200: 10, at1800: null, at0000: 5 },
      },
      7,
      durationUnit,
      variableValidationMessages,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.slots.at1800?.dose).toBe('Dosage is required');
  });
});

describe('calculateHybridQuantity', () => {
  const daysUnit = { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' };

  it('sums each phase daily total times phase days', () => {
    const state: HybridDosingState = {
      route: null,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Units' },
      phases: [
        {
          id: 'phase-1',
          duration: 7,
          durationUnit: daysUnit,
          pattern: 'tid',
          tidDoses: { morning: 10, noon: 6, evening: 8 },
          q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
        },
        {
          id: 'phase-2',
          duration: 3,
          durationUnit: daysUnit,
          pattern: 'q6h',
          tidDoses: { morning: null, noon: null, evening: null },
          q6hDoses: { at0600: 5, at1200: 5, at1800: 5, at0000: 5 },
        },
      ],
    };

    // (24 * 7) + (20 * 3) = 168 + 60 = 228
    expect(calculateHybridQuantity(state, durationUnitsDaysMap)).toBe(228);
  });

  it('returns null when a phase is missing a dose', () => {
    const state: HybridDosingState = {
      route: null,
      unit: null,
      phases: [
        {
          id: 'phase-1',
          duration: 7,
          durationUnit: daysUnit,
          pattern: 'tid',
          tidDoses: { morning: 10, noon: null, evening: 8 },
          q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
        },
      ],
    };

    expect(calculateHybridQuantity(state, durationUnitsDaysMap)).toBeNull();
  });

  it('returns null when a phase is missing duration', () => {
    const state: HybridDosingState = {
      route: null,
      unit: null,
      phases: [
        {
          id: 'phase-1',
          duration: null,
          durationUnit: daysUnit,
          pattern: 'tid',
          tidDoses: { morning: 10, noon: 6, evening: 8 },
          q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
        },
      ],
    };

    expect(calculateHybridQuantity(state, durationUnitsDaysMap)).toBeNull();
  });

  it('returns null for no phases', () => {
    expect(calculateHybridQuantity({ route: null, unit: null, phases: [] }, durationUnitsDaysMap)).toBeNull();
  });
});

describe('serializeHybridDosage', () => {
  const daysUnit = { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' };

  const hybridState: HybridDosingState = {
    route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Subcutaneous' },
    unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Units' },
    phases: [
      {
        id: 'phase-1',
        duration: 7,
        durationUnit: daysUnit,
        pattern: 'tid',
        tidDoses: { morning: 10, noon: 6, evening: 8 },
        q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
      },
      {
        id: 'phase-2',
        duration: 7,
        durationUnit: daysUnit,
        pattern: 'tid',
        tidDoses: { morning: 12, noon: 8, evening: 10 },
        q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
      },
    ],
  };

  it('serializes hybrid phases with duration and TID slots', () => {
    expect(serializeHybridDosage(hybridState)).toBe(
      'Phase 1 (7 Days): Morning: 10 Units, Noon: 6 Units, Evening: 8 Units; ' +
        'Phase 2 (7 Days): Morning: 12 Units, Noon: 8 Units, Evening: 10 Units',
    );
  });

  it('serializes Q6H phases', () => {
    expect(
      serializeHybridDosage({
        ...hybridState,
        phases: [
          {
            id: 'phase-1',
            duration: 3,
            durationUnit: daysUnit,
            pattern: 'q6h',
            tidDoses: { morning: null, noon: null, evening: null },
            q6hDoses: { at0600: 10, at1200: 10, at1800: 10, at0000: 5 },
          },
        ],
      }),
    ).toBe('Phase 1 (3 Days): 06:00: 10 Units, 12:00: 10 Units, 18:00: 10 Units, 00:00: 5 Units');
  });

  it('skips phases with no duration or no doses', () => {
    expect(
      serializeHybridDosage({
        ...hybridState,
        phases: [
          hybridState.phases[0],
          {
            id: 'phase-2',
            duration: null,
            durationUnit: daysUnit,
            pattern: 'tid',
            tidDoses: { morning: 12, noon: 8, evening: 10 },
            q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
          },
        ],
      }),
    ).toBe('Phase 1 (7 Days): Morning: 10 Units, Noon: 6 Units, Evening: 8 Units');
  });

  it('returns null when nothing is complete', () => {
    expect(
      serializeHybridDosage({
        route: null,
        unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Units' },
        phases: [
          {
            id: 'phase-1',
            duration: null,
            durationUnit: null,
            pattern: 'tid',
            tidDoses: { morning: null, noon: null, evening: null },
            q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
          },
        ],
      }),
    ).toBeNull();
  });
});

describe('validateHybridDosing', () => {
  const daysUnit = { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' };

  const validState: HybridDosingState = {
    route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
    unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
    phases: [
      {
        id: 'phase-1',
        duration: 7,
        durationUnit: daysUnit,
        pattern: 'tid',
        tidDoses: { morning: 10, noon: 6, evening: 8 },
        q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
      },
    ],
  };

  it('returns valid for a complete hybrid regimen', () => {
    expect(validateHybridDosing(validState, variableValidationMessages).isValid).toBe(true);
  });

  it('requires route and dose unit', () => {
    const result = validateHybridDosing({ ...validState, route: null, unit: null }, variableValidationMessages);

    expect(result.isValid).toBe(false);
    expect(result.errors.route).toBe('Route is required');
    expect(result.errors.unit).toBe('Dose unit is required');
  });

  it('flags per-phase duration, duration unit, and TID slot errors', () => {
    const result = validateHybridDosing(
      {
        ...validState,
        phases: [
          {
            id: 'phase-1',
            duration: null,
            durationUnit: null,
            pattern: 'tid',
            tidDoses: { morning: 10, noon: null, evening: 8 },
            q6hDoses: { at0600: null, at1200: null, at1800: null, at0000: null },
          },
        ],
      },
      variableValidationMessages,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.phases['phase-1'].duration).toBe('Duration is required');
    expect(result.errors.phases['phase-1'].durationUnit).toBe('Duration unit is required');
    expect(result.errors.phases['phase-1'].slots?.noon?.dose).toBe('Dosage is required');
  });

  it('validates Q6H slots when phase pattern is q6h', () => {
    const result = validateHybridDosing(
      {
        ...validState,
        phases: [
          {
            id: 'phase-1',
            duration: 3,
            durationUnit: daysUnit,
            pattern: 'q6h',
            tidDoses: { morning: null, noon: null, evening: null },
            q6hDoses: { at0600: 5, at1200: null, at1800: 5, at0000: 5 },
          },
        ],
      },
      variableValidationMessages,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.phases['phase-1'].slots?.at1200?.dose).toBe('Dosage is required');
  });
});

describe('validateTaperingDosing', () => {
  const validState: TaperingDosingState = {
    route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
    unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
    phases: [
      createPhase({
        dose: 40,
        frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1 },
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      }),
    ],
  };

  it('returns valid for a complete tapering regimen', () => {
    expect(validateTaperingDosing(validState, validationMessages).isValid).toBe(true);
  });

  it('requires route and dose unit', () => {
    const result = validateTaperingDosing({ ...validState, route: null, unit: null }, validationMessages);

    expect(result.isValid).toBe(false);
    expect(result.errors.route).toBe('Route is required');
    expect(result.errors.unit).toBe('Dose unit is required');
  });

  it('flags zero dose and incomplete added phases', () => {
    const result = validateTaperingDosing(
      {
        ...validState,
        phases: [{ ...validState.phases[0], dose: 0 }, createPhase({ id: 'phase-2', dose: 20 })],
      },
      validationMessages,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.phases['phase-1']?.dose).toBe('Dose must be greater than 0');
    expect(result.errors.phases['phase-2']?.frequency).toBe('Frequency is required');
  });
});
