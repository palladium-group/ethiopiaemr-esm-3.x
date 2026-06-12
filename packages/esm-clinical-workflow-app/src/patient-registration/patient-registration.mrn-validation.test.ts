import { validateMrnNumber, mrnLengthValidationMessage } from './patient-registration.mrn-validation';
import { patientMrnIdentifierInUse } from './patient-registration.resource';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
  Type: {
    Boolean: 'Boolean',
    String: 'String',
    Number: 'Number',
    UUID: 'UUID',
    Array: 'Array',
    Object: 'Object',
    ConceptUuid: 'ConceptUuid',
  },
  validator: (fn: () => boolean) => fn,
}));

const { openmrsFetch } = jest.requireMock('@openmrs/esm-framework');
const { configSchema, DEFAULT_MRN_NUMBER_LENGTH } = jest.requireActual(
  '../config-schema',
) as typeof import('../config-schema');

const configuredDefaultMrnLength = configSchema.mrnNumberLength._default as number;

describe('mrnNumberLength config', () => {
  it('uses config schema as the source of truth for the default length', () => {
    expect(configuredDefaultMrnLength).toBe(DEFAULT_MRN_NUMBER_LENGTH);
  });
});

describe('validateMrnNumber', () => {
  it('accepts empty values for any configured length', () => {
    for (const length of [4, configuredDefaultMrnLength, 8]) {
      expect(validateMrnNumber('', length)).toBeUndefined();
      expect(validateMrnNumber(undefined, length)).toBeUndefined();
      expect(validateMrnNumber('   ', length)).toBeUndefined();
    }
  });

  it('rejects non-numeric values', () => {
    expect(validateMrnNumber('12a456', configuredDefaultMrnLength)).toBe('MRN must contain only digits');
  });

  describe.each([
    { length: 4, valid: '1234', tooShort: '123', tooLong: '12345' },
    {
      length: configuredDefaultMrnLength,
      valid: '1'.repeat(configuredDefaultMrnLength),
      tooShort: '1'.repeat(configuredDefaultMrnLength - 1),
      tooLong: '1'.repeat(configuredDefaultMrnLength + 1),
    },
    { length: 8, valid: '12345678', tooShort: '1234567', tooLong: '123456789' },
  ])('when mrnNumberLength is $length', ({ length, valid, tooShort, tooLong }) => {
    it('accepts a value with the configured length', () => {
      expect(validateMrnNumber(valid, length)).toBeUndefined();
    });

    it('rejects values that do not match the configured length', () => {
      const message = mrnLengthValidationMessage(length);
      expect(validateMrnNumber(tooShort, length)).toBe(message);
      expect(validateMrnNumber(tooLong, length)).toBe(message);
      expect(message).toBe(`MRN must be exactly ${length} digits`);
    });
  });
});

describe('patientMrnIdentifierInUse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when another patient has the same MRN identifier type', async () => {
    (openmrsFetch as jest.Mock).mockResolvedValue({
      data: {
        results: [
          {
            uuid: 'patient-1',
            identifiers: [
              {
                identifier: '123456',
                voided: false,
                identifierType: { uuid: 'mrn-type-uuid' },
              },
            ],
          },
        ],
      },
    });

    await expect(patientMrnIdentifierInUse('123456', 'mrn-type-uuid')).resolves.toBe(true);
  });

  it('returns false when no matching patient identifier is found', async () => {
    (openmrsFetch as jest.Mock).mockResolvedValue({ data: { results: [] } });

    await expect(patientMrnIdentifierInUse('123456', 'mrn-type-uuid')).resolves.toBe(false);
  });
});
