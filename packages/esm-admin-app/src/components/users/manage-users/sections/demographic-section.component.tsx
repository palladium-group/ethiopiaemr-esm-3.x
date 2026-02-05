import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ResponsiveWrapper } from '@openmrs/esm-framework';
import { Column, TextInput, RadioButtonGroup, RadioButton, Button } from '@carbon/react';
import { ProviderAutosuggest } from '../provider-autosuggest.component';
import type { ProviderSearchResult } from '../provider-search.resource';
import type { UserFormSchema } from '../hooks/useUserManagementForm';
import styles from '../user-management.workspace.scss';

interface DemographicSectionProps {
  control: Control<UserFormSchema>;
  errors: FieldErrors<UserFormSchema>;
  isInitialValuesEmpty: boolean;
  isProviderReadOnly?: boolean;
  onProviderSelected: (providerData: ProviderSearchResult) => void;
  onFormReset?: () => void;
  showResetButton?: boolean;
  formResetKey?: number;
  isFormDirty?: boolean;
}

export const DemographicSection: React.FC<DemographicSectionProps> = ({
  control,
  errors,
  isInitialValuesEmpty,
  isProviderReadOnly = false,
  onProviderSelected,
  onFormReset,
  showResetButton = false,
  formResetKey = 0,
  isFormDirty = false,
}) => {
  const { t } = useTranslation();

  return (
    <ResponsiveWrapper>
      {isInitialValuesEmpty && (
        <Column>
          <ProviderAutosuggest key={formResetKey} onProviderSelected={onProviderSelected} />
          {showResetButton && onFormReset && (
            <Button kind="ghost" size="sm" onClick={onFormReset} disabled={!isFormDirty}>
              {t('reset', 'Reset')}
            </Button>
          )}
        </Column>
      )}
      <span className={styles.formHeaderSection}>{t('demographicInfo', 'Demographic info')}</span>
      <ResponsiveWrapper>
        <Controller
          name="givenName"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="givenName"
              type="text"
              labelText={t('givenName', 'Given Name')}
              placeholder={t('userGivenName', 'Enter Given Name')}
              disabled={isProviderReadOnly}
              invalid={!!errors.givenName}
              invalidText={errors.givenName?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="middleName"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="middleName"
              labelText={t('middleName', 'Middle Name')}
              placeholder={t('middleName', 'Middle Name')}
              disabled={isProviderReadOnly}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="familyName"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="familyName"
              labelText={t('familyName', 'Family Name')}
              placeholder={t('familyName', 'Family Name')}
              disabled={isProviderReadOnly}
              invalid={!!errors.familyName}
              invalidText={errors.familyName?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="phoneNumber"
              type="text"
              disabled={isProviderReadOnly}
              labelText={t('phoneNumber', 'Phone Number')}
              placeholder={t('phoneNumber', 'Enter Phone Number')}
              invalid={!!errors.phoneNumber}
              invalidText={errors.phoneNumber?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="email"
              type="email"
              disabled={isProviderReadOnly}
              labelText={t('email', 'Email')}
              placeholder={t('email', 'Enter Email')}
              invalid={!!errors.email}
              invalidText={errors.email?.message}
              className={styles.checkboxLabelSingleLine}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <RadioButtonGroup
              {...field}
              legendText={t('sex', 'Sex')}
              orientation="vertical"
              disabled={isProviderReadOnly}
              invalid={!!errors.gender}
              invalidText={errors.gender?.message}>
              <RadioButton value="M" id="M" labelText={t('male', 'Male')} checked={field.value === 'M'} />
              <RadioButton value="F" id="F" labelText={t('female', 'Female')} checked={field.value === 'F'} />
            </RadioButtonGroup>
          )}
        />
      </ResponsiveWrapper>
    </ResponsiveWrapper>
  );
};
