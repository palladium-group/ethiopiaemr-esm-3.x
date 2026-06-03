import {
  calculateTaperingQuantity,
  calculateTaperingTotalDurationDays,
  serializeTaperingDosage,
  validateTaperingDosing,
} from './complex-dosing.utils';
import type { TaperingDosingState, TaperingPhase, TaperingValidationMessages } from './complex-dosing.types';

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
