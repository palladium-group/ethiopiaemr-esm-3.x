import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  Checkbox,
  Dropdown,
  FormGroup,
  InlineLoading,
  InlineNotification,
  NumberInput,
  Search,
  TextInput,
} from '@carbon/react';
import { Search as SearchIcon } from '@carbon/react/icons';
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
  buildDisabilityTypeAttributeValue,
  calculateDOBFromAgeFields,
  saveAllergy,
  saveCondition,
} from './patient-registration.resource';
import { useGenerateIdentifier } from './useGenerateIdentifier';
import { useHealthIdLookup } from './useHealthIdLookup';
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
    firstName: z.string().min(1, 'Given name is required'),
    middleName: z.string().min(1, "Father's name is required"),
    lastName: z.string().min(1, "Grandfather's name is required"),
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
    isEstimatedDOB: z.boolean().optional().default(false),
    dateOfBirth: z
      .date({
        required_error: 'Date of birth is required',
      })
      .refine((date) => date <= new Date(), {
        message: 'Date of birth cannot be in the future',
      })
      .optional()
      .nullable(),
    disabilityNone: z.boolean().optional().default(true),
    disabilityVisionLoss: z.boolean().optional().default(false),
    disabilityHearingLoss: z.boolean().optional().default(false),
    disabilityMobilityImpairment: z.boolean().optional().default(false),
    disabilityOther: z.boolean().optional().default(false),
    disabilityOtherSpecify: z.string().optional().default(''),
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
  )
  .superRefine((data, ctx) => {
    if (data.disabilityOther && !(data.disabilityOtherSpecify ?? '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify when Other is selected',
        path: ['disabilityOtherSpecify'],
      });
    }
    if (
      data.disabilityNone &&
      (data.disabilityVisionLoss ||
        data.disabilityHearingLoss ||
        data.disabilityMobilityImpairment ||
        data.disabilityOther)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Uncheck specific disability types when No disability is selected',
        path: ['disabilityNone'],
      });
    }
  });

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
  const {
    identifierSourceUuid,
    defaultIdentifierTypeUuid,
    disabilityStatusAttributeTypeUuid,
    healthIdLookupUrl,
    healthIdIdentifierTypeUuid,
    bloodTypeAttributeTypeUuid,
    phoneAttributeTypeUuid,
    emailAttributeTypeUuid,
    allergySeverityConceptUuids,
  } = useConfig<ClinicalWorkflowConfig>();
  const { sessionLocation } = useSession();
  const { identifier } = useGenerateIdentifier(identifierSourceUuid);

  const [healthIdInput, setHealthIdInput] = useState('');
  const [submittedHealthId, setSubmittedHealthId] = useState<string | null>(null);
  const [resolvedHealthId, setResolvedHealthId] = useState<string | null>(null);
  const [isLockedByHealthId, setIsLockedByHealthId] = useState(false);
  const [healthIdAddresses, setHealthIdAddresses] = useState<any[]>([]);

  const {
    patient: healthIdPatient,
    isLoading: isSearchingHealthId,
    isNotFound: healthIdNotFound,
  } = useHealthIdLookup(submittedHealthId, healthIdLookupUrl);

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
      isEstimatedDOB: false,
      dateOfBirth: null,
      disabilityNone: true,
      disabilityVisionLoss: false,
      disabilityHearingLoss: false,
      disabilityMobilityImpairment: false,
      disabilityOther: false,
      disabilityOtherSpecify: '',
    },
  });

  const ageYears = useWatch({ control, name: 'ageYears' });
  const ageMonths = useWatch({ control, name: 'ageMonths' });
  const ageDays = useWatch({ control, name: 'ageDays' });
  const ageHours = useWatch({ control, name: 'ageHours' });
  const ageMinutes = useWatch({ control, name: 'ageMinutes' });
  const disabilityOther = useWatch({ control, name: 'disabilityOther' });

  const clearSpecificDisabilityFields = () => {
    setValue('disabilityVisionLoss', false, { shouldDirty: true });
    setValue('disabilityHearingLoss', false, { shouldDirty: true });
    setValue('disabilityMobilityImpairment', false, { shouldDirty: true });
    setValue('disabilityOther', false, { shouldDirty: true });
    setValue('disabilityOtherSpecify', '', { shouldDirty: true });
  };

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

  useEffect(() => {
    if (!healthIdPatient) {
      return;
    }
    // Log the full Health ID response to verify data structure
    // eslint-disable-next-line no-console
    console.log('[Health ID Lookup] Full response:', healthIdPatient);
    // eslint-disable-next-line no-console
    console.log('[Health ID Lookup] Extra fields:', {
      allergies: healthIdPatient.fhir.allergies,
      chronicDiseases: healthIdPatient.fhir.chronicDiseases,
      bloodType: healthIdPatient.fhir.bloodType,
      phone: healthIdPatient.fhir.phone,
      email: healthIdPatient.fhir.email,
    });

    const { names, gender, birthdate, addresses } = healthIdPatient.fhir.person;
    const name = names?.[0];
    if (name) {
      setValue('firstName', name.givenName ?? '', { shouldDirty: true });
      setValue('middleName', name.middleName ?? '', { shouldDirty: true });
      setValue('lastName', name.familyName ?? '', { shouldDirty: true });
    }
    const mappedGender =
      gender?.toLowerCase() === 'male' ? 'Male' : gender?.toLowerCase() === 'female' ? 'Female' : null;
    if (mappedGender) {
      setValue('gender', mappedGender as 'Male' | 'Female', { shouldDirty: true });
    }
    if (birthdate) {
      setValue('dateOfBirth', new Date(birthdate), { shouldDirty: true });
    }

    if (addresses && addresses.length > 0) {
      setHealthIdAddresses(addresses);
    }
    setResolvedHealthId(healthIdPatient.fhir.healthId ?? null);
    setIsLockedByHealthId(true);
  }, [healthIdPatient, setValue]);

  const handleHealthIdSearch = () => {
    const trimmed = healthIdInput.trim();
    if (trimmed) {
      setSubmittedHealthId(trimmed);
    }
  };

  const handleHealthIdClear = () => {
    setHealthIdInput('');
    setSubmittedHealthId(null);
    setResolvedHealthId(null);
    setIsLockedByHealthId(false);
    setHealthIdAddresses([]);
    setValue('firstName', '', { shouldDirty: false });
    setValue('middleName', '', { shouldDirty: false });
    setValue('lastName', '', { shouldDirty: false });
    setValue('gender', null, { shouldDirty: false });
    setValue('dateOfBirth', null, { shouldDirty: false });
    setValue('disabilityNone', true, { shouldDirty: false });
    setValue('disabilityVisionLoss', false, { shouldDirty: false });
    setValue('disabilityHearingLoss', false, { shouldDirty: false });
    setValue('disabilityMobilityImpairment', false, { shouldDirty: false });
    setValue('disabilityOther', false, { shouldDirty: false });
    setValue('disabilityOtherSpecify', '', { shouldDirty: false });
  };

  const onSubmit = async (data: PatientRegistrationFormData) => {
    const uuid = generateOfflineUuid()?.replace('OFFLINE+', '');
    try {
      // Extract Health ID extra fields to include in initial registration
      const healthIdExtraFields = healthIdPatient?.fhir
        ? {
            bloodType: healthIdPatient.fhir.bloodType,
            phone: healthIdPatient.fhir.phone,
            email: healthIdPatient.fhir.email,
          }
        : {};

      const disabilityTypeAttributeValue = buildDisabilityTypeAttributeValue(data);

      const registrationPayload = buildPatientRegistrationPayload(
        data,
        uuid,
        identifier,
        defaultIdentifierTypeUuid,
        sessionLocation.uuid,
        disabilityTypeAttributeValue,
        disabilityStatusAttributeTypeUuid,
        resolvedHealthId ?? undefined,
        healthIdIdentifierTypeUuid || undefined,
        healthIdAddresses.length > 0 ? healthIdAddresses : undefined,
        healthIdExtraFields.bloodType,
        bloodTypeAttributeTypeUuid,
        healthIdExtraFields.phone,
        phoneAttributeTypeUuid,
        healthIdExtraFields.email,
        emailAttributeTypeUuid,
      );

      const patient = await registerNewPatient(registrationPayload);

      const patientData = patient?.data as any;
      const patientUuid = patientData?.uuid || patientData?.id;

      if (patientUuid) {
        // Persist FHIR resources from Health ID lookup (allergies and chronic diseases)
        if (healthIdPatient?.fhir) {
          const { allergies = [], chronicDiseases = [] } = healthIdPatient.fhir;
          const persistencePromises: Promise<void>[] = [];

          if (allergies.length > 0) {
            persistencePromises.push(
              ...allergies
                .filter((a) => a.allergenUuid)
                .map((allergy) =>
                  saveAllergy(patientUuid, allergy, allergySeverityConceptUuids).catch((error) => {
                    console.error(`[Health ID] Failed to save allergy: ${allergy.allergenDisplay}`, error);
                    throw error;
                  }),
                ),
            );
          }
          if (chronicDiseases.length > 0) {
            persistencePromises.push(
              ...chronicDiseases
                .filter((c) => c.conditionUuid)
                .map((condition) =>
                  saveCondition(patientUuid, condition).catch((error) => {
                    console.error(`[Health ID] Failed to save condition: ${condition.conditionDisplay}`, error);
                    throw error;
                  }),
                ),
            );
          }

          // Run all persistence operations in parallel and track failures
          if (persistencePromises.length > 0) {
            const results = await Promise.allSettled(persistencePromises);
            const failures = results.filter((r) => r.status === 'rejected');

            if (failures.length > 0) {
              console.error(`[Health ID] ${failures.length} of ${results.length} health data fields failed to save`);
              failures.forEach((failure) => {
                if (failure.status === 'rejected') {
                  console.error('[Health ID] Failure details:', failure.reason);
                }
              });

              showSnackbar({
                title: t('partialHealthIdDataSaved', 'Some health ID information could not be saved'),
                subtitle: t(
                  'partialHealthIdDataSavedDetail',
                  'Patient was registered successfully, but some allergies or conditions could not be saved. Please verify in the patient chart.',
                ),
                kind: 'warning',
                isLowContrast: true,
              });
            }
          }
        }

        showSnackbar({
          title: t('patientRegistrationSuccess', 'Patient registered successfully'),
          kind: 'success',
          isLowContrast: true,
        });

        closeWorkspaceWithSavedChanges();

        if (onPatientRegistered) {
          try {
            onPatientRegistered(patientUuid);
          } catch (callbackError) {
            // eslint-disable-next-line no-console
            console.error('Error in onPatientRegistered callback:', callbackError);
          }
        }
      }
    } catch (error: any) {
      const err = error?.responseBody?.error;
      const errorMessage =
        err?.globalErrors?.[0]?.message ??
        err?.message ??
        (error instanceof Error ? error.message : null) ??
        t('patientRegistrationErrorSubtitle', 'Please try again.');
      showSnackbar({
        title: t('patientRegistrationError', 'Error registering patient'),
        kind: 'error',
        subtitle: errorMessage,
        isLowContrast: true,
      });
    } finally {
    }
  };

  const isEmpiDemographicsLocked = isLockedByHealthId;

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className={styles.formContainer}>
        <div className={styles.healthIdSection}>
          <div className={styles.healthIdRow}>
            <Search
              id="health-id-search"
              labelText={t('searchByHealthId', 'Search by Health ID')}
              placeholder={t('enterHealthId', 'Enter Health ID')}
              value={healthIdInput}
              onChange={(e) => {
                setHealthIdInput(e.target.value);
                if (!e.target.value) {
                  handleHealthIdClear();
                }
              }}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  handleHealthIdSearch();
                }
              }}
              onClear={handleHealthIdClear}
              disabled={isSearchingHealthId}
              size="md"
            />
            <Button
              hasIconOnly
              renderIcon={isSearchingHealthId ? InlineLoading : SearchIcon}
              iconDescription={t('search', 'Search')}
              tooltipPosition="bottom"
              kind="primary"
              size="md"
              onClick={handleHealthIdSearch}
              disabled={!healthIdInput.trim() || isSearchingHealthId || !healthIdLookupUrl}
            />
          </div>
          {healthIdNotFound && (
            <InlineNotification
              kind="info"
              title=""
              subtitle={t(
                'healthIdNotFound',
                'No patient found with this Health ID. You can fill in the details manually.',
              )}
              lowContrast
              hideCloseButton
            />
          )}
          {isLockedByHealthId && (
            <InlineNotification
              kind="success"
              title=""
              subtitle={t(
                'healthIdFound',
                'Patient information has been automatically populated from the Health ID system.',
              )}
              lowContrast
              hideCloseButton
            />
          )}
        </div>

        <Controller
          name="firstName"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ResponsiveWrapper>
              <TextInput
                id="first-name"
                labelText={t('firstName', 'Given Name')}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                invalid={isSubmitted && !!errors.firstName}
                invalidText={isSubmitted ? errors.firstName?.message : ''}
                placeholder={t('enterFirstName', 'Enter Given Name')}
                size="md"
                type="text"
                disabled={isSubmitting || isEmpiDemographicsLocked}
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
                labelText={t('middleName', "Father's Name")}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                invalid={isSubmitted && !!errors.middleName}
                invalidText={isSubmitted ? errors.middleName?.message : ''}
                placeholder={t('enterMiddleName', "Enter Father's Name")}
                size="md"
                type="text"
                disabled={isSubmitting || isEmpiDemographicsLocked}
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
                labelText={t('lastName', "Grandfather's Name")}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                invalid={isSubmitted && !!errors.lastName}
                invalidText={isSubmitted ? errors.lastName?.message : ''}
                placeholder={t('enterLastName', "Enter Grandfather's Name")}
                size="md"
                type="text"
                disabled={isSubmitting || isEmpiDemographicsLocked}
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
                disabled={isSubmitting || isEmpiDemographicsLocked}
              />
            </ResponsiveWrapper>
          )}
        />

        <ResponsiveWrapper>
          <div className={styles.ageSection}>
            <FormGroup
              legendText={t('age', 'Age')}
              className={classNames(styles.ageFormGroup, {
                [styles.ageFormGroupNotSubmitted]: !isSubmitted,
              })}>
              <div className={styles.ageRowSpread}>
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
                      disabled: isSubmitting || isEmpiDemographicsLocked,
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
                      disabled: isSubmitting || isEmpiDemographicsLocked,
                      allowEmpty: true,
                    };
                    if (isSubmitted) {
                      numberInputProps.min = 0;
                      numberInputProps.max = 11;
                    }
                    return <NumberInput {...numberInputProps} />;
                  }}
                />
              </div>
              <div className={styles.ageRowSpread}>
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
                      disabled: isSubmitting || isEmpiDemographicsLocked,
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
                      disabled: isSubmitting || isEmpiDemographicsLocked,
                      allowEmpty: true,
                    };
                    if (isSubmitted) {
                      numberInputProps.min = 0;
                      numberInputProps.max = 23;
                    }
                    return <NumberInput {...numberInputProps} />;
                  }}
                />
              </div>
              <div className={styles.ageRow}>
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
                      disabled: isSubmitting || isEmpiDemographicsLocked,
                      allowEmpty: true,
                    };
                    if (isSubmitted) {
                      numberInputProps.min = 0;
                      numberInputProps.max = 59;
                    }
                    return <NumberInput {...numberInputProps} />;
                  }}
                />
              </div>
            </FormGroup>
          </div>
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
                disabled={isSubmitting || isEmpiDemographicsLocked}
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
                isDisabled={isSubmitting || isEmpiDemographicsLocked}
              />
            </ResponsiveWrapper>
          )}
        />

        <FormGroup legendText={t('disabilityType', 'Disability type')}>
          <div className={styles.disabilityTypeSection}>
            <Controller
              name="disabilityNone"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  id="disability-none"
                  labelText={t('disabilityTypeNone', 'No disability')}
                  checked={!!value}
                  onChange={(_, { checked }) => {
                    onChange(checked);
                    if (checked) {
                      clearSpecificDisabilityFields();
                    }
                  }}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name="disabilityVisionLoss"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  id="disability-vision-loss"
                  labelText={t('disabilityTypeVisionLoss', 'Vision loss')}
                  checked={!!value}
                  onChange={(_, { checked }) => {
                    onChange(checked);
                    if (checked) {
                      setValue('disabilityNone', false, { shouldDirty: true });
                    }
                  }}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name="disabilityHearingLoss"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  id="disability-hearing-loss"
                  labelText={t('disabilityTypeHearingLoss', 'Hearing loss')}
                  checked={!!value}
                  onChange={(_, { checked }) => {
                    onChange(checked);
                    if (checked) {
                      setValue('disabilityNone', false, { shouldDirty: true });
                    }
                  }}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name="disabilityMobilityImpairment"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  id="disability-mobility"
                  labelText={t('disabilityTypeMobilityImpairment', 'Mobility impairment')}
                  checked={!!value}
                  onChange={(_, { checked }) => {
                    onChange(checked);
                    if (checked) {
                      setValue('disabilityNone', false, { shouldDirty: true });
                    }
                  }}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name="disabilityOther"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  id="disability-other"
                  labelText={t('disabilityTypeOther', 'Other')}
                  checked={!!value}
                  onChange={(_, { checked }) => {
                    onChange(checked);
                    if (checked) {
                      setValue('disabilityNone', false, { shouldDirty: true });
                    } else {
                      setValue('disabilityOtherSpecify', '', { shouldDirty: true });
                    }
                  }}
                  disabled={isSubmitting}
                />
              )}
            />
            {disabilityOther ? (
              <Controller
                name="disabilityOtherSpecify"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    id="disability-other-specify"
                    labelText={t('disabilityTypeOtherSpecify', 'If other, specify')}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={isSubmitting}
                    invalid={isSubmitted && !!errors.disabilityOtherSpecify}
                    invalidText={
                      isSubmitted && errors.disabilityOtherSpecify ? errors.disabilityOtherSpecify.message : ''
                    }
                  />
                )}
              />
            ) : null}
          </div>
        </FormGroup>
      </div>

      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.button} disabled={isSubmitting || !isDirty} kind="primary" type="submit">
          {isSubmitting ? (
            <InlineLoading className={styles.spinner} description={t('saving', 'Saving') + '...'} />
          ) : (
            <span>{t('registerPatient', 'Register Patient')}</span>
          )}
        </Button>
      </ButtonSet>
    </form>
  );
};

export default PatientRegistration;
