import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ResponsiveWrapper, useConfig } from '@openmrs/esm-framework';
import { TextInput, CheckboxGroup, Checkbox, DatePicker, DatePickerInput, InlineLoading } from '@carbon/react';
import type { UserFormSchema } from '../hooks/useUserManagementForm';
import type { ProviderWithAttributes } from '../../../../user-management.resources';
import type { ConfigObject } from '../../../../config-schema';
import { extractAttributeFromProvider } from '../user-management.utils';
import styles from '../user-management.workspace.scss';

interface ProviderSectionProps {
  control: Control<UserFormSchema>;
  errors: FieldErrors<UserFormSchema>;
  isInitialValuesEmpty: boolean;
  isProviderReadOnly?: boolean;
  loadingProvider: boolean;
  providerError: unknown;
  provider: ProviderWithAttributes[];
}

export const ProviderSection: React.FC<ProviderSectionProps> = ({
  control,
  errors,
  isInitialValuesEmpty,
  isProviderReadOnly = false,
  loadingProvider,
  providerError,
  provider,
}) => {
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const externalId =
    provider.length > 0 ? extractAttributeFromProvider(provider[0], config.providerExternalIdAttributeTypeUuid) : '';
  const ihrisIdentifier =
    provider.length > 0
      ? extractAttributeFromProvider(provider[0], config.providerIHRISIdentifierAttributeTypeUuid)
      : '';

  return (
    <ResponsiveWrapper>
      <span className={styles.formHeaderSection}>{t('providerDetails', 'Provider details')}</span>
      <ResponsiveWrapper>
        <Controller
          name="providerUniqueIdentifier"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="providerUniqueIdentifier"
              type="text"
              labelText={t('providerUniqueIdentifier', 'Provider Unique Identifier')}
              placeholder={t('providerUniqueIdentifierPlaceholder', 'Enter Provider Unqiue Identifier')}
              disabled={isProviderReadOnly}
              invalid={!!errors.providerUniqueIdentifier}
              invalidText={errors.providerUniqueIdentifier?.message}
            />
          )}
        />
      </ResponsiveWrapper>
      {externalId && (
        <ResponsiveWrapper>
          <TextInput
            id="externalId"
            type="text"
            labelText={t('externalId', 'External ID')}
            value={externalId}
            readOnly
            className={styles.checkboxLabelSingleLine}
          />
        </ResponsiveWrapper>
      )}
      {ihrisIdentifier && (
        <ResponsiveWrapper>
          <TextInput
            id="ihrisIdentifier"
            type="text"
            labelText={t('ihrisIdentifier', 'IHRIS Identifier')}
            value={ihrisIdentifier}
            readOnly
            className={styles.checkboxLabelSingleLine}
          />
        </ResponsiveWrapper>
      )}
      <ResponsiveWrapper>
        <Controller
          name="nationalId"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="nationalId"
              disabled={isProviderReadOnly}
              type="text"
              labelText={t('nationalID', 'National id')}
              placeholder={t('nationalID', 'National id')}
              invalid={!!errors.nationalId}
              invalidText={errors.nationalId?.message}
              className={styles.checkboxLabelSingleLine}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="passportNumber"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="passportNumber"
              disabled={isProviderReadOnly}
              type="text"
              labelText={t('passportNumber', 'Passport number')}
              placeholder={t('passportNumber', 'Passport number')}
              invalid={!!errors.nationalId}
              invalidText={errors.nationalId?.message}
              className={styles.checkboxLabelSingleLine}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="providerLicense"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="providerLicense"
              type="text"
              disabled={isProviderReadOnly}
              labelText={t('providerLicense', 'License Number')}
              placeholder={t('providerLicense', 'License Number')}
              className={styles.checkboxLabelSingleLine}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="registrationNumber"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="registrationNumber"
              type="text"
              disabled={isProviderReadOnly}
              labelText={t('registrationNumber', 'Registration Number')}
              placeholder={t('registrationNumber', 'Registration Number')}
              className={styles.checkboxLabelSingleLine}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="qualification"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="qualification"
              type="qualification"
              disabled={isProviderReadOnly}
              labelText={t('qualification', 'Qualification')}
              placeholder={t('qualification', 'Qualification')}
              invalid={!!errors.qualification}
              invalidText={errors.qualification?.message}
              className={styles.checkboxLabelSingleLine}
            />
          )}
        />
      </ResponsiveWrapper>
      <ResponsiveWrapper>
        <Controller
          name="licenseExpiryDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              datePickerType="single"
              className={styles.formDatePicker}
              onChange={(event) => {
                if (event.length) {
                  field.onChange(event[0]);
                }
              }}
              value={field.value ? new Date(field.value) : ''}>
              <DatePickerInput
                className={styles.formDatePicker}
                placeholder="mm/dd/yyyy"
                labelText={t('licenseExpiryDate', 'License Expiry Date')}
                id="formLicenseDatePicker"
                size="md"
                disabled={isProviderReadOnly}
                invalid={!!errors.licenseExpiryDate}
                invalidText={errors.licenseExpiryDate?.message}
              />
            </DatePicker>
          )}
        />
      </ResponsiveWrapper>
      {loadingProvider || providerError ? (
        <InlineLoading status="active" iconDescription="Loading" description="Loading data..." />
      ) : provider.length > 0 ? (
        <>
          <ResponsiveWrapper>
            <Controller
              name="systemId"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  id="systemeId"
                  type="text"
                  labelText={t('providerId', 'Provider Id')}
                  placeholder={t('providerId', 'Provider Id')}
                  disabled={isProviderReadOnly}
                  invalid={!!errors.systemId}
                  invalidText={errors.systemId?.message}
                  className={styles.checkboxLabelSingleLine}
                />
              )}
            />
            {!isProviderReadOnly && (
              <Controller
                name="isEditProvider"
                control={control}
                render={({ field }) => (
                  <CheckboxGroup
                    legendText={t('editProvider', 'Edit Provider Details')}
                    className={styles.multilineCheckboxLabel}>
                    <Checkbox
                      className={styles.checkboxLabelSingleLine}
                      id="isEditProvider"
                      labelText={t('EditProviderDetails', 'Edit provider details?')}
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </CheckboxGroup>
                )}
              />
            )}
          </ResponsiveWrapper>
        </>
      ) : (
        <>
          <Controller
            name="providerIdentifiers"
            control={control}
            render={({ field }) => (
              <CheckboxGroup
                legendText={t('providerIdentifiers', 'Provider Details')}
                className={styles.multilineCheckboxLabel}>
                <Checkbox
                  className={styles.checkboxLabelSingleLine}
                  id="providerIdentifiersa"
                  labelText={t('providerIdentifiers', 'Create a Provider account for this user')}
                  checked={field.value || false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </CheckboxGroup>
            )}
          />
        </>
      )}
    </ResponsiveWrapper>
  );
};
