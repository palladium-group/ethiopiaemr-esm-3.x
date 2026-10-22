import { FormManager, SavePatientTransactionManager } from './form-manager';
import { type FormValues } from './patient-registration.types';
import {
  generateIdentifier,
  savePatient,
  addPatientIdentifier,
  updatePatientIdentifier,
  deletePatientIdentifier,
  deletePersonName,
} from './patient-registration.resource';

jest.mock('./patient-registration.resource', () => ({
  ...jest.requireActual('./patient-registration.resource'),
  generateIdentifier: jest.fn(),
  savePatient: jest.fn(),
  addPatientIdentifier: jest.fn(),
  updatePatientIdentifier: jest.fn(),
  deletePatientIdentifier: jest.fn(),
  deletePersonName: jest.fn(),
}));

const mockGenerateIdentifier = jest.mocked(generateIdentifier);
const mockSavePatient = jest.mocked(savePatient);
const mockAddPatientIdentifier = jest.mocked(addPatientIdentifier);

const formValues: FormValues = {
  patientUuid: '',
  givenName: '',
  middleName: '',
  familyName: '',
  additionalGivenName: '',
  additionalMiddleName: '',
  additionalFamilyName: '',
  addNameInLocalLanguage: false,
  gender: '',
  birthdate: '',
  yearsEstimated: 1000,
  monthsEstimated: 11,
  birthdateEstimated: false,
  birthtime: undefined,
  birthtimeFormat: 'AM',
  telephoneNumber: '',
  isDead: false,
  deathDate: 'string',
  deathTime: '',
  deathTimeFormat: 'AM',
  deathCause: 'string',
  nonCodedCauseOfDeath: '',
  relationships: [],
  address: {
    address1: '',
    address2: '',
    cityVillage: '',
    stateProvince: 'New York',
    country: 'string',
    postalCode: 'string',
  },
  identifiers: {
    foo: {
      identifierUuid: 'aUuid',
      identifierName: 'Foo',
      required: false,
      initialValue: 'foo',
      identifierValue: 'foo',
      identifierTypeUuid: 'identifierType',
      preferred: true,
      autoGeneration: false,
      selectedSource: {
        uuid: 'some-uuid',
        name: 'unique',
        autoGenerationOption: { manualEntryEnabled: true, automaticGenerationEnabled: false },
      },
    },
  },
};

describe('FormManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createIdentifiers', () => {
    it('uses the uuid of a field name if it exists', async () => {
      const result = await FormManager.savePatientIdentifiers(true, undefined, formValues.identifiers, {}, 'Nyc');
      expect(result).toEqual([
        {
          uuid: 'aUuid',
          identifier: 'foo',
          identifierType: 'identifierType',
          location: 'Nyc',
          preferred: true,
        },
      ]);
    });

    it('should generate identifier if it has autoGeneration and manual entry disabled', async () => {
      formValues.identifiers.foo.autoGeneration = true;
      formValues.identifiers.foo.selectedSource.autoGenerationOption.manualEntryEnabled = false;
      mockGenerateIdentifier.mockResolvedValue({ data: { identifier: '10001V' } } as any);
      await FormManager.savePatientIdentifiers(true, undefined, formValues.identifiers, {}, 'Nyc');
      expect(mockGenerateIdentifier.mock.calls).toHaveLength(1);
    });

    it('should not generate identifiers if manual entry enabled and identifier value given', async () => {
      formValues.identifiers.foo.autoGeneration = true;
      formValues.identifiers.foo.selectedSource.autoGenerationOption.manualEntryEnabled = true;
      await FormManager.savePatientIdentifiers(true, undefined, formValues.identifiers, {}, 'Nyc');
      expect(mockGenerateIdentifier.mock.calls).toHaveLength(0);
    });
  });

  describe('savePatientFormOnline', () => {
    const editFormValues: FormValues = {
      ...formValues,
      patientUuid: 'patient-uuid-123',
      givenName: 'Abebe',
      familyName: 'Bekele',
      gender: 'male',
      birthdate: '1990-01-01',
      identifiers: {
        healthId: {
          identifierTypeUuid: 'health-id-type-uuid',
          identifierName: 'Health ID',
          required: false,
          initialValue: '',
          identifierValue: 'HID-123456',
          preferred: false,
          autoGeneration: false,
          selectedSource: null,
        },
      },
    };

    const mockSession: any = {
      currentProvider: { uuid: 'provider-1' },
      sessionLocation: { uuid: 'loc-1' },
    };

    const mockConfig: any = {
      fieldConfigurations: {},
      fieldDefinitions: [],
    };

    it('updates patient details first, and only attaches identifier if update succeeds', async () => {
      const callOrder: string[] = [];
      mockSavePatient.mockImplementation(async () => {
        callOrder.push('savePatient');
        return { ok: true, data: { uuid: 'patient-uuid-123' } } as any;
      });
      mockAddPatientIdentifier.mockImplementation(async () => {
        callOrder.push('addPatientIdentifier');
        return {} as any;
      });

      const txManager = new SavePatientTransactionManager();
      const resultUuid = await FormManager.savePatientFormOnline(
        false,
        editFormValues,
        {},
        {},
        null,
        'loc-1',
        {},
        mockSession,
        mockConfig,
        txManager,
      );

      expect(resultUuid).toBe('patient-uuid-123');
      expect(callOrder).toEqual(['savePatient', 'addPatientIdentifier']);
      expect(mockSavePatient).toHaveBeenCalledTimes(1);
      expect(mockAddPatientIdentifier).toHaveBeenCalledTimes(1);
      expect(mockAddPatientIdentifier).toHaveBeenCalledWith(
        'patient-uuid-123',
        expect.objectContaining({
          identifier: 'HID-123456',
          identifierType: 'health-id-type-uuid',
        }),
      );
    });

    it('does NOT attach identifier if patient details update fails via rejected promise', async () => {
      mockSavePatient.mockRejectedValue(new Error('Network error updating patient details'));

      const txManager = new SavePatientTransactionManager();
      await expect(
        FormManager.savePatientFormOnline(
          false,
          editFormValues,
          {},
          {},
          null,
          'loc-1',
          {},
          mockSession,
          mockConfig,
          txManager,
        ),
      ).rejects.toThrow('Network error updating patient details');

      expect(mockSavePatient).toHaveBeenCalledTimes(1);
      expect(mockAddPatientIdentifier).not.toHaveBeenCalled();
    });

    it('does NOT attach identifier if patient details update returns non-ok response', async () => {
      mockSavePatient.mockResolvedValue({ ok: false, status: 500 } as any);

      const txManager = new SavePatientTransactionManager();
      await expect(
        FormManager.savePatientFormOnline(
          false,
          editFormValues,
          {},
          {},
          null,
          'loc-1',
          {},
          mockSession,
          mockConfig,
          txManager,
        ),
      ).rejects.toThrow('Failed to update patient details');

      expect(mockSavePatient).toHaveBeenCalledTimes(1);
      expect(mockAddPatientIdentifier).not.toHaveBeenCalled();
    });
  });
});
