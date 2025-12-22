import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Dropdown, InlineLoading, TextInput } from '@carbon/react';
import {
  OpenmrsDatePicker,
  showSnackbar,
  generateOfflineUuid,
  useSession,
  useConfig,
  useLayoutType,
  DefaultWorkspaceProps,
  ResponsiveWrapper,
} from '@openmrs/esm-framework';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { ClinicalWorkflowConfig } from '../config-schema';
import { registerNewPatient, buildPatientRegistrationPayload } from './patient-registration.resource';
import { useStartVisitAndLaunchTriageForm } from '../triage/useStartVisitAndLaunchTriageForm';
import { getTriageFormForLocation } from '../triage/triage.resource';
import { useGenerateIdentifier } from './useGenerateIdentifier';
import styles from './patient.registration.workspace.scss';
import classNames from 'classnames';

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

export type PatientRegistrationFormData = z.infer<typeof patientRegistrationSchema>;

const PatientRegistration: React.FC<DefaultWorkspaceProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { handleStartVisitAndLaunchTriageForm } = useStartVisitAndLaunchTriageForm();
  const { visitTypeUuid, identifierSourceUuid, defaultIdentifierTypeUuid, triageLocationForms } =
    useConfig<ClinicalWorkflowConfig>();
  const { sessionLocation } = useSession();
  const { identifier } = useGenerateIdentifier(identifierSourceUuid);

  const triageFormConfig = getTriageFormForLocation(sessionLocation?.uuid, triageLocationForms);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
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

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [promptBeforeClosing, isDirty]);

  const onSubmit = async (data: PatientRegistrationFormData) => {
    const uuid = generateOfflineUuid()?.replace('OFFLINE+', '');
    try {
      const registrationPayload = buildPatientRegistrationPayload(
        data,
        uuid,
        identifier,
        defaultIdentifierTypeUuid,
        sessionLocation.uuid,
      );

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

        if (triageFormConfig) {
          await handleStartVisitAndLaunchTriageForm(patientUuid, triageFormConfig.formUuid);
        } else {
          showSnackbar({
            title: t('noTriageFormConfigured', 'No triage form configured'),
            subtitle: t(
              'noTriageFormConfiguredForLocation',
              'No triage form is configured for the current location. Please configure a form for this location.',
            ),
            kind: 'warning',
            isLowContrast: true,
          });
        }
        closeWorkspaceWithSavedChanges();
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
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.formContainer}>
        <Controller
          name="firstName"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <TextInput
                id="first-name"
                labelText={t('firstName', 'First Name')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                invalid={!!errors.firstName}
                invalidText={errors.firstName?.message}
                placeholder={t('enterFirstName', 'Enter Your First Name')}
                size="md"
                type="text"
                disabled={isSubmitting}
              />
            </ResponsiveWrapper>
          )}
        />

        <Controller
          name="middleName"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <TextInput
                id="middle-name"
                labelText={t('middleName', 'Middle Name')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                invalid={!!errors.middleName}
                invalidText={errors.middleName?.message}
                placeholder={t('enterMiddleName', 'Enter Middle Name')}
                size="md"
                type="text"
                disabled={isSubmitting}
              />
            </ResponsiveWrapper>
          )}
        />

        <Controller
          name="lastName"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <TextInput
                id="last-name"
                labelText={t('lastName', 'Last Name')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                invalid={!!errors.lastName}
                invalidText={errors.lastName?.message}
                placeholder={t('enterLastName', 'Enter Last Name')}
                size="md"
                type="text"
                disabled={isSubmitting}
              />
            </ResponsiveWrapper>
          )}
        />

        <Controller
          name="gender"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
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
            </ResponsiveWrapper>
          )}
        />

        <Controller
          name="dateOfBirth"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <OpenmrsDatePicker
                labelText={t('selectDOB', 'Select Date of Birth')}
                maxDate={new Date()}
                value={value}
                invalid={!!errors.dateOfBirth}
                invalidText={errors.dateOfBirth?.message}
                onChange={(date) => onChange(date)}
                isDisabled={isSubmitting}
              />
            </ResponsiveWrapper>
          )}
        />
      </div>

      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.button} disabled={isSubmitting || !isDirty} kind="primary" type="submit">
          {isSubmitting ? (
            <InlineLoading className={styles.spinner} description={t('saving', 'Saving') + '...'} />
          ) : (
            <span>{t('saveAndClose', 'Save & close')}</span>
          )}
        </Button>
      </ButtonSet>
    </form>
  );
};

export default PatientRegistration;
