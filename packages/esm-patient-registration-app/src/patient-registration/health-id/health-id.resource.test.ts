import { fetchPatientByHealthId, isHealthIdIdentifierAttached } from './health-id.resource';

describe('health-id.resource', () => {
  const originalFetch = window.fetch;

  afterEach(() => {
    window.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws error when healthId is empty', async () => {
    await expect(fetchPatientByHealthId('', '/lookup')).rejects.toThrow('Health ID is required');
    await expect(fetchPatientByHealthId('   ', '/lookup')).rejects.toThrow('Health ID is required');
  });

  it('fetches patient successfully when Health ID exists', async () => {
    const mockResponse = {
      success: true,
      fhir: {
        healthId: 'HID-001',
        person: {
          names: [{ givenName: 'Abebe', middleName: 'Kebede', familyName: 'Alemu' }],
          gender: 'male',
          birthdate: '1990-01-01',
        },
      },
      message: 'Patient found',
    };

    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any);

    const result = await fetchPatientByHealthId('HID-001', 'http://localhost/mpi');
    expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('healthId=HID-001'));
    expect(result).toEqual(mockResponse);
  });

  it('returns not found response gracefully when status is 404', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({
        success: false,
        patientNotFound: true,
        message: 'Patient not found in MPI',
      }),
    } as any);

    const result = await fetchPatientByHealthId('NONEXISTENT', 'http://localhost/mpi');
    expect(result.success).toBe(false);
    expect(result.patientNotFound).toBe(true);
  });

  it('throws error when server responds with 500 error', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ message: 'Internal Server Error' }),
    } as any);

    await expect(fetchPatientByHealthId('HID-ERR', 'http://localhost/mpi')).rejects.toThrow('Internal Server Error');
  });

  describe('isHealthIdIdentifierAttached', () => {
    it('returns false when identifiers is null or undefined or empty', () => {
      expect(isHealthIdIdentifierAttached(null)).toBe(false);
      expect(isHealthIdIdentifierAttached(undefined)).toBe(false);
      expect(isHealthIdIdentifierAttached({})).toBe(false);
      expect(isHealthIdIdentifierAttached([])).toBe(false);
    });

    it('returns true when an identifier matches healthIdIdentifierTypeUuid with valid value', () => {
      const identifiers = {
        customId: {
          identifierTypeUuid: 'cce42242-9e55-40a6-8739-1e6be1369bbe',
          identifierValue: 'HID-12345',
        },
      };
      expect(isHealthIdIdentifierAttached(identifiers, 'cce42242-9e55-40a6-8739-1e6be1369bbe')).toBe(true);
    });

    it('returns true when identifierName contains health', () => {
      const identifiers = {
        nationalHealthId: {
          identifierTypeUuid: 'other-uuid',
          identifierName: 'National Health ID',
          identifierValue: 'ETH-9999',
        },
      };
      expect(isHealthIdIdentifierAttached(identifiers)).toBe(true);
    });

    it('returns false when identifierValue is empty or auto-generated', () => {
      const emptyVal = {
        healthId: {
          identifierTypeUuid: 'cce42242-9e55-40a6-8739-1e6be1369bbe',
          identifierValue: '',
        },
      };
      expect(isHealthIdIdentifierAttached(emptyVal, 'cce42242-9e55-40a6-8739-1e6be1369bbe')).toBe(false);

      const autoGenVal = {
        healthId: {
          identifierTypeUuid: 'cce42242-9e55-40a6-8739-1e6be1369bbe',
          identifierValue: 'auto-generated',
        },
      };
      expect(isHealthIdIdentifierAttached(autoGenVal, 'cce42242-9e55-40a6-8739-1e6be1369bbe')).toBe(false);
    });

    it('returns false when identifiers do not match Health ID type or name', () => {
      const identifiers = {
        openmrsId: {
          identifierTypeUuid: 'some-other-uuid',
          identifierName: 'OpenMRS ID',
          identifierValue: '10001V',
        },
      };
      expect(isHealthIdIdentifierAttached(identifiers, 'cce42242-9e55-40a6-8739-1e6be1369bbe')).toBe(false);
    });
  });
});
