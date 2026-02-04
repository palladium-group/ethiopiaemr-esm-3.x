import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { ResponsiveWrapper } from '@openmrs/esm-framework';
import { TextInput, PasswordInput, CheckboxGroup, Checkbox } from '@carbon/react';
import type { UserFormSchema } from '../hooks/useUserManagementForm';
import styles from '../user-management.workspace.scss';

interface LoginSectionProps {
  control: Control<UserFormSchema>;
  errors: FieldErrors<UserFormSchema>;
  isInitialValuesEmpty: boolean;
  watch: UseFormWatch<UserFormSchema>;
}

export const LoginSection: React.FC<LoginSectionProps> = ({ control, errors, isInitialValuesEmpty, watch }) => {
  const { t } = useTranslation();

  return (
    <ResponsiveWrapper>
      <span className={styles.formHeaderSection}>{t('loginInfo', 'Login Info')}</span>
      <ResponsiveWrapper>
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="username"
              labelText={t('username', 'Username')}
              invalid={!!errors.username}
              invalidText={errors.username?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="password"
          control={control}
          rules={
            isInitialValuesEmpty
              ? {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters long' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                    message: 'Password must include uppercase, lowercase, and a number',
                  },
                }
              : {}
          }
          render={({ field }) => (
            <PasswordInput
              {...field}
              id="password"
              labelText="Password"
              invalid={!!errors.password}
              invalidText={errors.password?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="confirmPassword"
          control={control}
          rules={
            isInitialValuesEmpty
              ? {
                  required: 'Please confirm your password',
                  validate: (value) => value === watch('password') || 'Passwords do not match',
                }
              : {}
          }
          render={({ field }) => (
            <PasswordInput
              {...field}
              id="confirmPassword"
              labelText="Confirm Password"
              invalid={!!errors.confirmPassword}
              invalidText={errors.confirmPassword?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="forcePasswordChange"
          control={control}
          render={({ field }) => (
            <CheckboxGroup
              legendText={t('forcePasswordChange', 'Force Password Change')}
              className={styles.checkboxGroupGrid}>
              <Checkbox
                className={styles.multilineCheckboxLabel}
                id="forcePasswordChange"
                labelText={t(
                  'forcePasswordChangeHelper',
                  'Optionally require this user to change their password on next login',
                )}
                checked={!!field.value || false}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            </CheckboxGroup>
          )}
        />
      </ResponsiveWrapper>
    </ResponsiveWrapper>
  );
};
