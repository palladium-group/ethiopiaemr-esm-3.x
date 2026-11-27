import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Formik, Form } from 'formik';
import { HealthIdSearch } from './health-id-search.component';
import { PatientRegistrationContextProvider } from '../patient-registration-context';
import { NameField } from '../field/name/name-field.component';
import { type FormValues } from '../patient-registration.types';
import { type HealthIdPatient } from './health-id.resource';

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: () => ({
    fieldConfigurations: {
      name: {
        displayCapturePhoto: false,
        allowUnidentifiedPatients: false,
        displayMiddleName: true,
        displayReverseFieldOrder: false,
      },
    },
  }),
  ExtensionSlot: () => null,
  showSnackbar: jest.fn(),
}));

describe('Health ID Edit Workflow Integration', () => {
  const originalFetch = window.fetch;

  afterEach(() => {
    window.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const initialValues: FormValues = {
    givenName: 'OldGiven',
    middleName: 'OldFather',
    familyName: 'OldGrandfather',
    gender: 'male',
    birthdate: new Date('1990-01-01'),
    birthdateEstimated: false,
    birthtime: '',
    birthtimeFormat: 'AM',
    deathCause: '',
    deathDate: '',
    deathTime: '',
    deathTimeFormat: 'AM',
    isDead: false,
    monthsEstimated: 0,
    nonCodedCauseOfDeath: '',
    patientUuid: 'patient-123',
    relationships: [],
    telephoneNumber: '',
    yearsEstimated: 0,
    additionalFamilyName: '',
    additionalGivenName: '',
    additionalMiddleName: '',
    addNameInLocalLanguage: false,
    address: {},
    identifiers: {},
  };

  const mockRegistryPatient: HealthIdPatient = {
    success: true,
    message: 'Found',
    fhir: {
      healthId: 'HID-8888',
      person: {
        names: [{ givenName: 'RegistryFirst', middleName: 'RegistryFather', familyName: 'RegistryFamily' }],
        gender: 'female',
        birthdate: '1995-05-15',
      },
      phone: '0911223344',
    },
  };

  const TestWrapper = () => {
    const [isHealthIdOverwritten, setIsHealthIdOverwritten] = React.useState(false);

    const isEmpiDemographicsLocked = isHealthIdOverwritten;

    return (
      <Formik initialValues={initialValues} onSubmit={jest.fn()}>
        {(formikProps) => {
          const handleOverwriteConfirm = (patient: HealthIdPatient) => {
            const mpiPerson = patient.fhir.person;
            const mpiName = mpiPerson?.names?.[0];

            formikProps.setValues({
              ...formikProps.values,
              givenName: mpiName?.givenName || formikProps.values.givenName,
              middleName: mpiName?.middleName || formikProps.values.middleName,
              familyName: mpiName?.familyName || formikProps.values.familyName,
              identifiers: {
                ...formikProps.values.identifiers,
                healthId: {
                  identifierTypeUuid: 'health-id-uuid',
                  identifierName: 'Health ID',
                  preferred: false,
                  initialValue: '',
                  identifierValue: patient.fhir.healthId,
                  required: false,
                  selectedSource: null,
                  autoGeneration: false,
                },
              },
            });
            setIsHealthIdOverwritten(true);
          };

          const contextValue = {
            currentPhoto: '',
            identifierTypes: [],
            inEditMode: true,
            isEmpiDemographicsLocked,
            initialFormValues: initialValues,
            isOffline: false,
            setCapturePhotoProps: jest.fn(),
            setFieldTouched: formikProps.setFieldTouched,
            setFieldValue: formikProps.setFieldValue,
            validationSchema: null,
            values: formikProps.values,
          };

          return (
            <Form>
              {!isHealthIdOverwritten && (
                <HealthIdSearch
                  lookupUrl="/mpi"
                  currentFormValues={formikProps.values}
                  onOverwriteConfirm={handleOverwriteConfirm}
                />
              )}
              <PatientRegistrationContextProvider value={contextValue}>
                <NameField />
              </PatientRegistrationContextProvider>
            </Form>
          );
        }}
      </Formik>
    );
  };

  it('completes the full search -> diff modal -> overwrite -> lock cycle', async () => {
    const user = userEvent.setup();

    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockRegistryPatient),
    } as any);

    render(<TestWrapper />);

    // Initially demographic fields are editable with existing values
    const givenNameInput = screen.getByLabelText(/given name/i) as HTMLInputElement;
    expect(givenNameInput).toHaveValue('OldGiven');
    expect(givenNameInput).not.toBeDisabled();

    // 1. Search Health ID
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'HID-8888');

    const searchBtn = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchBtn);

    // 2. Diff modal opens with comparisons
    await screen.findByText(/Health ID Found — Review & Confirm Overwrite/i);
    expect(screen.getByText('HID-8888')).toBeInTheDocument();
    expect(screen.getByText('OldGiven')).toBeInTheDocument();
    expect(screen.getByText('RegistryFirst')).toBeInTheDocument();

    // 3. User clicks Confirm and Overwrite
    const confirmBtn = screen.getByRole('button', { name: /confirm and overwrite/i });
    await user.click(confirmBtn);

    // 4. Values on the form are replaced with Registry values
    await waitFor(() => {
      expect(givenNameInput).toHaveValue('RegistryFirst');
    });

    // 5. Demographics are now locked
    expect(givenNameInput).toBeDisabled();
  });

  it('persists data immediately to backend when Confirm and Overwrite is clicked', async () => {
    const user = userEvent.setup();
    const mockSaveOnline = jest.fn().mockResolvedValue('patient-123');

    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockRegistryPatient),
    } as any);

    const AsyncSaveWrapper = () => {
      return (
        <Formik initialValues={initialValues} onSubmit={jest.fn()}>
          {(formikProps) => (
            <Form>
              <HealthIdSearch
                lookupUrl="/mpi"
                currentFormValues={formikProps.values}
                onOverwriteConfirm={async (patient) => {
                  await mockSaveOnline(patient);
                  formikProps.setValues({
                    ...formikProps.values,
                    givenName: patient.fhir.person.names[0].givenName,
                    identifiers: {
                      ...formikProps.values.identifiers,
                      healthId: {
                        identifierTypeUuid: 'cce42242-9e55-40a6-8739-1e6be1369bbe',
                        identifierName: 'Health ID',
                        preferred: false,
                        initialValue: '',
                        identifierValue: patient.fhir.healthId,
                        required: false,
                        selectedSource: null,
                        autoGeneration: false,
                      },
                    },
                  });
                }}
              />
            </Form>
          )}
        </Formik>
      );
    };

    render(<AsyncSaveWrapper />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'HID-8888');

    const searchBtn = screen.getByRole('button', { name: /^search$/i });
    await user.click(searchBtn);

    await screen.findByText(/Health ID Found — Review & Confirm Overwrite/i);

    const confirmBtn = screen.getByRole('button', { name: /confirm and overwrite/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockSaveOnline).toHaveBeenCalledWith(mockRegistryPatient);
    });

    // The modal should close after successful save
    await waitFor(() => {
      expect(screen.queryByText(/Health ID Found — Review & Confirm Overwrite/i)).not.toBeInTheDocument();
    });
  });
});
