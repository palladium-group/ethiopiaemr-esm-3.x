import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Checkbox, Dropdown, FormGroup, InlineLoading, NumberInput, TextInput } from '@carbon/react';
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
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { ClinicalWorkflowConfig } from '../config-schema';
import {
  registerNewPatient,
  buildPatientRegistrationPayload,
  calculateDOBFromAgeFields,
} from './patient-registration.resource';
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

const patientRegistrationSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    middleName: z.string().min(1, 'Middle name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    gender: z.enum(['Male', 'Female'], {
      required_error: 'Gender is required',
    }),
    ageYears: z
      .union([z.number().min(0).max(150), z.null()])
      .optional()
      .nullable(),
    ageMonths: z
      .union([z.number().min(0).max(11), z.null()])
      .optional()
      .nullable(),
    ageDays: z
      .union([z.number().min(0).max(31), z.null()])
      .optional()
      .nullable(),
    ageHours: z
      .union([z.number().min(0).max(23), z.null()])
      .optional()
      .nullable(),
    ageMinutes: z
      .union([z.number().min(0).max(59), z.null()])
      .optional()
      .nullable(),
    isEstimatedDOB: z.boolean().optional().default(true),
    dateOfBirth: z
      .date({
        required_error: 'Date of birth is required',
      })
      .refine((date) => date <= new Date(), {
        message: 'Date of birth cannot be in the future',
      })
      .optional()
      .nullable(),
    isMedicoLegalCase: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      const hasDateOfBirth = !!data.dateOfBirth;
      const hasAgeFields =
        (data.ageYears !== undefined && data.ageYears !== null && data.ageYears >= 0) ||
        (data.ageMonths !== undefined && data.ageMonths !== null && data.ageMonths >= 0) ||
        (data.ageDays !== undefined && data.ageDays !== null && data.ageDays >= 0) ||
        (data.ageHours !== undefined && data.ageHours !== null && data.ageHours >= 0) ||
        (data.ageMinutes !== undefined && data.ageMinutes !== null && data.ageMinutes >= 0);
      return hasDateOfBirth || hasAgeFields;
    },
    {
      message: 'Please provide either date of birth or age information',
      path: ['dateOfBirth'],
    },
  );

export type PatientRegistrationFormData = z.infer<typeof patientRegistrationSchema>;

type PatientRegistrationProps = DefaultWorkspaceProps & {
  onPatientRegistered?: (patientUuid: string) => void;
};

const PatientRegistration: React.FC<PatientRegistrationProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  onPatientRegistered,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { identifierSourceUuid, defaultIdentifierTypeUuid, medicoLegalCasesAttributeTypeUuid } =
    useConfig<ClinicalWorkflowConfig>();
  const { sessionLocation } = useSession();
  const { identifier } = useGenerateIdentifier(identifierSourceUuid);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldFocusError: false,
    shouldUnregister: false,
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: null,
      ageYears: null,
      ageMonths: null,
      ageDays: null,
      ageHours: null,
      ageMinutes: null,
      isEstimatedDOB: true,
      dateOfBirth: null,
      isMedicoLegalCase: false,
    },
  });

  const ageYears = useWatch({ control, name: 'ageYears' });
  const ageMonths = useWatch({ control, name: 'ageMonths' });
  const ageDays = useWatch({ control, name: 'ageDays' });
  const ageHours = useWatch({ control, name: 'ageHours' });
  const ageMinutes = useWatch({ control, name: 'ageMinutes' });

  const dobManuallySetRef = useRef(false);
  const lastCalculatedDOBRef = useRef<Date | null>(null);

  useEffect(() => {
    const calculatedDOB = calculateDOBFromAgeFields(ageYears, ageMonths, ageDays, ageHours, ageMinutes);

    if (calculatedDOB && !dobManuallySetRef.current) {
      if (!lastCalculatedDOBRef.current || calculatedDOB.getTime() !== lastCalculatedDOBRef.current.getTime()) {
        setValue('dateOfBirth', calculatedDOB, { shouldDirty: true });
        lastCalculatedDOBRef.current = calculatedDOB;
      }
    } else if (!calculatedDOB) {
      lastCalculatedDOBRef.current = null;
    }
  }, [ageYears, ageMonths, ageDays, ageHours, ageMinutes, setValue]);

  useEffect(() => {
    // Reset the manual flag when age fields change, allowing auto-calculation to resume
    dobManuallySetRef.current = false;
  }, [ageYears, ageMonths, ageDays, ageHours, ageMinutes]);

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
        data.isMedicoLegalCase,
        medicoLegalCasesAttributeTypeUuid,
      );

      const patient = await registerNewPatient(registrationPayload);

      const patientData = patient?.data as any;
      const patientUuid = patientData?.uuid || patientData?.id;

      if (patientUuid) {
        showSnackbar({
          title: t('patientRegistrationSuccess', 'Patient registered successfully'),
          kind: 'success',
          isLowContrast: true,
        });

        if (onPatientRegistered) {
          try {
            onPatientRegistered(patientUuid);
          } catch (callbackError) {
            console.error('Error in onPatientRegistered callback:', callbackError);
          }
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
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
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
                invalid={isSubmitted && !!errors.firstName}
                invalidText={isSubmitted ? errors.firstName?.message : ''}
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
                invalid={isSubmitted && !!errors.middleName}
                invalidText={isSubmitted ? errors.middleName?.message : ''}
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
                invalid={isSubmitted && !!errors.lastName}
                invalidText={isSubmitted ? errors.lastName?.message : ''}
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
                invalid={isSubmitted && !!errors.gender}
                invalidText={isSubmitted ? errors.gender?.message || t('invalidSelection', 'Invalid selection') : ''}
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

        <ResponsiveWrapper>
          <FormGroup
            legendText={t('age', 'Age')}
            className={classNames(styles.ageFormGroup, {
              [styles.ageFormGroupNotSubmitted]: !isSubmitted,
            })}>
            <Controller
              name="ageYears"
              control={control}
              render={({ field: { onChange, value } }) => {
                const invalidValue = isSubmitted && !!errors.ageYears;
                const displayValue = value !== undefined && value !== null ? value : '';
                const invalidTextValue = isSubmitted && errors.ageYears ? errors.ageYears.message : undefined;
                const numberInputProps: any = {
                  id: 'age-years',
                  label: t('years', 'Years'),
                  value: displayValue === '' ? undefined : displayValue,
                  onChange: (e: any, { value: newValue }: any) => {
                    const numValue =
                      newValue === '' || newValue === null || newValue === undefined ? undefined : Number(newValue);
                    onChange(numValue);
                  },
                  invalid: invalidValue || false,
                  invalidText: invalidTextValue,
                  warn: false,
                  placeholder: t('enterYears', 'Enter years'),
                  size: 'md',
                  disabled: isSubmitting,
                  allowEmpty: true,
                };
                if (isSubmitted) {
                  numberInputProps.min = 0;
                  numberInputProps.max = 150;
                }
                return <NumberInput {...numberInputProps} />;
              }}
            />
            <Controller
              name="ageMonths"
              control={control}
              render={({ field: { onChange, value } }) => {
                const invalidValue = isSubmitted && !!errors.ageMonths;
                const invalidTextValue = isSubmitted && errors.ageMonths ? errors.ageMonths.message : undefined;
                const displayValue = value !== undefined && value !== null ? value : '';
                const numberInputProps: any = {
                  id: 'age-months',
                  label: t('months', 'Months'),
                  value: displayValue === '' ? undefined : displayValue,
                  onChange: (e: any, { value: newValue }: any) => {
                    const numValue =
                      newValue === '' || newValue === null || newValue === undefined ? undefined : Number(newValue);
                    onChange(numValue);
                  },
                  invalid: invalidValue || false,
                  invalidText: invalidTextValue,
                  warn: false,
                  placeholder: t('enterMonths', 'Enter months'),
                  size: 'md',
                  disabled: isSubmitting,
                  allowEmpty: true,
                };
                if (isSubmitted) {
                  numberInputProps.min = 0;
                  numberInputProps.max = 11;
                }
                return <NumberInput {...numberInputProps} />;
              }}
            />
            <Controller
              name="ageDays"
              control={control}
              render={({ field: { onChange, value } }) => {
                const invalidValue = isSubmitted && !!errors.ageDays;
                const invalidTextValue = isSubmitted && errors.ageDays ? errors.ageDays.message : undefined;
                const displayValue = value !== undefined && value !== null ? value : '';
                const numberInputProps: any = {
                  id: 'age-days',
                  label: t('days', 'Days'),
                  value: displayValue === '' ? undefined : displayValue,
                  onChange: (e: any, { value: newValue }: any) => {
                    const numValue =
                      newValue === '' || newValue === null || newValue === undefined ? undefined : Number(newValue);
                    onChange(numValue);
                  },
                  invalid: invalidValue || false,
                  invalidText: invalidTextValue,
                  warn: false,
                  placeholder: t('enterDays', 'Enter days'),
                  size: 'md',
                  disabled: isSubmitting,
                  allowEmpty: true,
                };
                if (isSubmitted) {
                  numberInputProps.min = 0;
                  numberInputProps.max = 31;
                }
                return <NumberInput {...numberInputProps} />;
              }}
            />
            <Controller
              name="ageHours"
              control={control}
              render={({ field: { onChange, value } }) => {
                const invalidValue = isSubmitted && !!errors.ageHours;
                const invalidTextValue = isSubmitted && errors.ageHours ? errors.ageHours.message : undefined;
                const displayValue = value !== undefined && value !== null ? value : '';
                const numberInputProps: any = {
                  id: 'age-hours',
                  label: t('hours', 'Hours'),
                  value: displayValue === '' ? undefined : displayValue,
                  onChange: (e: any, { value: newValue }: any) => {
                    const numValue =
                      newValue === '' || newValue === null || newValue === undefined ? undefined : Number(newValue);
                    onChange(numValue);
                  },
                  invalid: invalidValue || false,
                  invalidText: invalidTextValue,
                  warn: false,
                  placeholder: t('enterHours', 'Enter hours'),
                  size: 'md',
                  disabled: isSubmitting,
                  allowEmpty: true,
                };
                if (isSubmitted) {
                  numberInputProps.min = 0;
                  numberInputProps.max = 23;
                }
                return <NumberInput {...numberInputProps} />;
              }}
            />
            <Controller
              name="ageMinutes"
              control={control}
              render={({ field: { onChange, value } }) => {
                const invalidValue = isSubmitted && !!errors.ageMinutes;
                const invalidTextValue = isSubmitted && errors.ageMinutes ? errors.ageMinutes.message : undefined;
                const displayValue = value !== undefined && value !== null ? value : '';
                const numberInputProps: any = {
                  id: 'age-minutes',
                  label: t('minutes', 'Minutes'),
                  value: displayValue === '' ? undefined : displayValue,
                  onChange: (e: any, { value: newValue }: any) => {
                    const numValue =
                      newValue === '' || newValue === null || newValue === undefined ? undefined : Number(newValue);
                    onChange(numValue);
                  },
                  invalid: invalidValue || false,
                  invalidText: invalidTextValue,
                  warn: false,
                  placeholder: t('enterMinutes', 'Enter minutes'),
                  size: 'md',
                  disabled: isSubmitting,
                  allowEmpty: true,
                };
                if (isSubmitted) {
                  numberInputProps.min = 0;
                  numberInputProps.max = 59;
                }
                return <NumberInput {...numberInputProps} />;
              }}
            />
          </FormGroup>
        </ResponsiveWrapper>

        <Controller
          name="isEstimatedDOB"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <Checkbox
                id="estimated-dob"
                labelText={t('estimated', 'Estimated')}
                checked={value || false}
                onChange={(event, { checked }) => onChange(checked)}
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
                invalid={isSubmitted && !!errors.dateOfBirth}
                invalidText={isSubmitted && errors.dateOfBirth ? errors.dateOfBirth.message : ''}
                onChange={(date) => {
                  dobManuallySetRef.current = true;
                  onChange(date);
                }}
                isDisabled={isSubmitting}
              />
            </ResponsiveWrapper>
          )}
        />

        <Controller
          name="isMedicoLegalCase"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <Checkbox
                id="medico-legal-case"
                labelText={t('medicoLegalCases', 'Medico Legal Cases')}
                checked={value || false}
                onChange={(event, { checked }) => onChange(checked)}
                disabled={isSubmitting}
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
