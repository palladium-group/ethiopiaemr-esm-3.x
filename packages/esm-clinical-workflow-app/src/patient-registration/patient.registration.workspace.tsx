import React, { useState } from 'react';
import { Button, Dropdown, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OpenmrsDatePicker, showSnackbar, generateOfflineUuid, useSession } from '@openmrs/esm-framework';
import { registerNewPatient, generateIdentifier } from './patient-registration.resource';
import useSWR from 'swr';
import styles from './patient.registration.workspace.scss';
import { handleStartVisitAndLaunchTriageForm } from '../helper';

const genderOptions = [
  {
    text: 'Male',
  },
  {
    text: 'Female',
  },
];

const patientRegistrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().min(1, 'Middle name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['Male', 'Female'], {
    required_error: 'Gender is required',
  }),
  dateOfBirth: z
    .date({
      required_error: 'Date of birth is required',
    })
    .refine((date) => date <= new Date(), {
      message: 'Date of birth cannot be in the future',
    }),
});

type PatientRegistrationFormData = z.infer<typeof patientRegistrationSchema>;

const PatientRegistration: React.FC = () => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: identifierData } = useSWR('generateIdentifier', () =>
    generateIdentifier('1952cc86-4f48-4737-a0ef-5e8a5bb63e41'),
  );
  const identifier = (identifierData?.data as any)?.identifier;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: undefined,
      dateOfBirth: undefined,
    },
  });

  const onSubmit = async (data: PatientRegistrationFormData) => {
    setIsSubmitting(true);
    const uuid = generateOfflineUuid()?.replace('OFFLINE+', '');
    try {
      // Format birthdate as YYYY-M-D (not zero-padded)
      const birthDate = new Date(data.dateOfBirth);
      const formattedBirthDate = `${birthDate.getFullYear()}-${birthDate.getMonth() + 1}-${birthDate.getDate()}`;

      // Map gender to single character (M/F)
      const genderCode = data.gender === 'Male' ? 'M' : 'F';

      // Build OpenMRS Patient payload
      const registrationPayload = {
        uuid: uuid,
        person: {
          uuid: uuid,
          names: [
            {
              preferred: true,
              givenName: data.firstName,
              middleName: data.middleName,
              familyName: data.lastName,
            },
          ],
          gender: genderCode,
          birthdate: formattedBirthDate,
          birthdateEstimated: false,
          attributes: [],
          addresses: [{}],
          dead: false,
        },
        identifiers: [
          {
            identifier: identifier,
            identifierType: 'dfacd928-0370-4315-99d7-6ec1c9f7ae76', // defailt openmrs identifier type
            location: sessionLocation.uuid, // TODO: get from session
            preferred: true,
          },
        ],
      };

      const patient = await registerNewPatient(registrationPayload);

      // OpenMRS REST API returns patient with uuid field
      const patientData = patient?.data as any;
      const patientUuid = patientData?.uuid || patientData?.id;

      if (patientUuid) {
        showSnackbar({
          title: t('patientRegistrationSuccess', 'Patient registered successfully'),
          kind: 'success',
          isLowContrast: true,
        });

        // Launch triage workspace for the patient
        await handleStartVisitAndLaunchTriageForm(patientUuid);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('patientRegistrationErrorSubtitle', 'Please try again.');
      showSnackbar({
        title: t('patientRegistrationError', 'Error registering patient'),
        kind: 'error',
        subtitle: errorMessage,
        isLowContrast: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.patientRegistrationFormContainer}>
      <TextInput
        id="first-name"
        labelText={t('firstName', 'First Name')}
        {...register('firstName')}
        invalid={!!errors.firstName}
        invalidText={errors.firstName?.message}
        placeholder={t('enterFirstName', 'Enter Your First Name')}
        size="md"
        type="text"
        disabled={isSubmitting}
      />

      <TextInput
        id="middle-name"
        labelText={t('middleName', 'Middle Name')}
        {...register('middleName')}
        invalid={!!errors.middleName}
        invalidText={errors.middleName?.message}
        placeholder={t('enterMiddleName', 'Enter Middle Name')}
        size="md"
        type="text"
        disabled={isSubmitting}
      />

      <TextInput
        id="last-name"
        labelText={t('lastName', 'Last Name')}
        {...register('lastName')}
        invalid={!!errors.lastName}
        invalidText={errors.lastName?.message}
        placeholder={t('enterLastName', 'Enter Last Name')}
        size="md"
        type="text"
        disabled={isSubmitting}
      />

      <Controller
        name="gender"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Dropdown
            id="gender"
            invalid={!!errors.gender}
            invalidText={errors.gender?.message || t('invalidSelection', 'Invalid selection')}
            itemToString={(item) => (item ? item.text : '')}
            items={genderOptions}
            label={t('gender', 'Gender')}
            titleText={t('selectGender', 'Select gender')}
            type="default"
            selectedItem={genderOptions.find((item) => item.text === value) || null}
            onChange={({ selectedItem }) => onChange(selectedItem?.text)}
            disabled={isSubmitting}
          />
        )}
      />

      <Controller
        name="dateOfBirth"
        control={control}
        render={({ field: { onChange, value } }) => (
          <div>
            <OpenmrsDatePicker
              labelText={t('selectDOB', 'Select Date of Birth')}
              maxDate={new Date()}
              value={value}
              onChange={(date) => onChange(date)}
              isDisabled={isSubmitting}
            />
            {errors.dateOfBirth && (
              <div style={{ color: '#da1e28', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.dateOfBirth.message}
              </div>
            )}
          </div>
        )}
      />

      <Button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? t('submittingRegistration', 'Submitting...') : t('submitRegistration', 'Submit Registration')}
      </Button>
    </form>
  );
};

export default PatientRegistration;
