import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ResponsiveWrapper } from '@openmrs/esm-framework';
import { TextInput, PasswordInput } from '@carbon/react';
import type { UserFormSchema } from '../hooks/useUserManagementForm';
import styles from '../user-management.workspace.scss';

interface LoginSectionProps {
  control: Control<UserFormSchema>;
  errors: FieldErrors<UserFormSchema>;
}

export const LoginSection: React.FC<LoginSectionProps> = ({ control, errors }) => {
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
              onBlur={(e) => {
                field.onBlur();
                const trimmed = e.target.value?.trim() ?? '';
                if (trimmed !== e.target.value) {
                  field.onChange(trimmed);
                }
              }}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <PasswordInput
              {...field}
              id="password"
              labelText={t('password', 'Password')}
              invalid={!!errors.password}
              invalidText={errors.password?.message}
              onBlur={(e) => {
                field.onBlur();
                const trimmed = e.target.value?.trim() ?? '';
                if (trimmed !== e.target.value) {
                  field.onChange(trimmed);
                }
              }}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <PasswordInput
              {...field}
              id="confirmPassword"
              labelText={t('confirmPassword', 'Confirm Password')}
              invalid={!!errors.confirmPassword}
              invalidText={errors.confirmPassword?.message}
              onBlur={(e) => {
                field.onBlur();
                const trimmed = e.target.value?.trim() ?? '';
                if (trimmed !== e.target.value) {
                  field.onChange(trimmed);
                }
              }}
            />
          )}
        />
      </ResponsiveWrapper>
    </ResponsiveWrapper>
  );
};
