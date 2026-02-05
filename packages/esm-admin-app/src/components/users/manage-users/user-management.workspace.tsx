import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefaultWorkspaceProps, useLayoutType, useConfig, parseDate } from '@openmrs/esm-framework';
import { FormProvider } from 'react-hook-form';
import styles from './user-management.workspace.scss';
import { ButtonSet, Button, InlineLoading, Stack, ProgressIndicator, ProgressStep } from '@carbon/react';
import classNames from 'classnames';
import {
  useRoles,
  useProvider,
  useProviderAttributeType,
  type ProviderWithAttributes,
} from '../../../user-management.resources';
import { useSystemUserRoleConfigSetting } from '../../hook/useSystemRoleSetting';
import { User } from '../../../types';
import { ConfigObject } from '../../../config-schema';
import { useUsers } from './user-list/user-list.resource';
import { type ProviderSearchResult } from './provider-search.resource';
import { extractNameParts, extractProviderFormValues } from './user-management.utils';
import { useProviderAttributeMapping } from './hooks/useProviderAttributeMapping';
import { useUserManagementForm } from './hooks/useUserManagementForm';
import { useUserFormSteps } from './hooks/useUserFormSteps';
import { useUserFormSubmission } from './hooks/useUserFormSubmission';
import { DemographicSection } from './sections/demographic-section.component';
import { ProviderSection } from './sections/provider-section.component';
import { LoginSection } from './sections/login-section.component';
import { RolesSection } from './sections/roles-section.component';

type ManageUserWorkspaceProps = DefaultWorkspaceProps & {
  initialUserValue?: User;
  initialProvider?: ProviderSearchResult | ProviderWithAttributes;
};

const ManageUserWorkspace: React.FC<ManageUserWorkspaceProps> = ({
  closeWorkspace,
  promptBeforeClosing,
  closeWorkspaceWithSavedChanges,
  initialUserValue = {} as User,
  initialProvider,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const [selectedProvider, setSelectedProvider] = useState<ProviderSearchResult | null>(null);

  // Gets providers by name and returns all rows if there is no match
  const { provider = [], loadingProvider, providerError } = useProvider(initialUserValue?.person?.display);

  const providerSource: ProviderWithAttributes[] = selectedProvider
    ? [selectedProvider as ProviderWithAttributes]
    : initialProvider
    ? [initialProvider as ProviderWithAttributes]
    : provider;

  const { users } = useUsers();
  const usernames =
    users?.map((user) => user.username).filter((username) => username !== initialUserValue?.username) || [];
  const isInitialValuesEmpty = Object.keys(initialUserValue).length === 0;

  const { providerAttributeType = [] } = useProviderAttributeType();
  const { roles = [], isLoading } = useRoles();
  const { rolesConfig } = useSystemUserRoleConfigSetting();
  const config = useConfig<ConfigObject>();

  const { attributeTypeMapping, providerValues } = useProviderAttributeMapping({
    provider: providerSource,
    providerAttributeType,
    config,
  });

  const { userFormMethods, errors, isSubmitting, isDirty } = useUserManagementForm({
    initialUserValue,
    usernames,
    providerValues,
    loadingProvider,
    isInitialValuesEmpty,
  });

  const { setValue, trigger } = userFormMethods;

  const isStepValid = useCallback(
    (stepIndex: number) => {
      switch (stepIndex) {
        case 0:
          return !errors.givenName && !errors.familyName && !errors.gender;
        case 1:
          if (isInitialValuesEmpty) {
            return !errors.username && !errors.password && !errors.confirmPassword;
          }
          return !errors.username;
        case 2:
        case 3:
        default:
          return true;
      }
    },
    [
      errors.givenName,
      errors.familyName,
      errors.gender,
      errors.username,
      errors.password,
      errors.confirmPassword,
      isInitialValuesEmpty,
    ],
  );

  const {
    steps,
    currentIndex,
    hasDemographicInfo,
    hasLoginInfo,
    hasProviderAccount,
    hasRoles,
    markStepComplete,
    isStepEnabled,
    handleBackClick,
    handleNextClick,
    handleStepChange,
    getSubmitButtonText,
    getSubmitButtonType,
    getSubmitButtonIcon,
  } = useUserFormSteps({ t, closeWorkspace, isInitialValuesEmpty, isStepValid });

  const handleNextWithValidation = useCallback(
    async (e: React.MouseEvent) => {
      let isValid = true;
      if (hasDemographicInfo) {
        isValid = await trigger(['givenName', 'familyName', 'gender']);
      } else if (hasLoginInfo) {
        isValid = isInitialValuesEmpty
          ? await trigger(['username', 'password', 'confirmPassword'])
          : await trigger(['username']);
      }
      if (!isValid) {
        return;
      }
      markStepComplete(currentIndex);
      handleNextClick(e);
    },
    [hasDemographicInfo, hasLoginInfo, isInitialValuesEmpty, currentIndex, trigger, markStepComplete, handleNextClick],
  );

  const { onSubmit, handleError } = useUserFormSubmission({
    attributeTypeMapping,
    selectedProvider,
    initialUserValue,
    provider: providerSource,
    personPhonenumberAttributeUuid: config.personPhonenumberAttributeUuid,
    personEmailAttributeUuid: config.personEmailAttributeUuid,
    licenseBodyUuid: config.licenseBodyUuid,
    providerNationalIdUuid: config.providerNationalIdUuid,
    licenseNumberUuid: config.licenseNumberUuid,
    passportNumberUuid: config.passportNumberUuid,
    providerUniqueIdentifierAttributeTypeUuid: config.providerUniqueIdentifierAttributeTypeUuid,
    closeWorkspaceWithSavedChanges,
    t,
  });

  useEffect(() => {
    if (isDirty) {
      promptBeforeClosing(() => isDirty);
    }
  }, [isDirty, promptBeforeClosing]);

  const setPersonValuesFromProvider = useCallback(
    (providerData: ProviderSearchResult) => {
      const display = providerData.person?.display ?? '';
      const { givenName, middleName, familyName } = extractNameParts(display);
      setValue('givenName', givenName, { shouldDirty: true });
      setValue('middleName', middleName, { shouldDirty: true });
      setValue('familyName', familyName, { shouldDirty: true });
      setValue('gender', (providerData.person?.gender as 'M' | 'F') || undefined, { shouldDirty: true });
      setSelectedProvider(providerData);
    },
    [setValue],
  );

  const setProviderValuesFromProvider = useCallback(
    (providerData: ProviderSearchResult) => {
      const values = extractProviderFormValues(providerData, attributeTypeMapping);
      setValue('providerUniqueIdentifier', values.providerUniqueIdentifier, { shouldDirty: true });
      setValue('nationalId', values.nationalId, { shouldDirty: true });
      setValue('passportNumber', values.passportNumber, { shouldDirty: true });
      setValue('providerLicense', values.providerLicenseNumber, { shouldDirty: true });
      setValue('registrationNumber', values.registrationNumber, { shouldDirty: true });
      setValue('qualification', values.qualification, { shouldDirty: true });
      setValue(
        'licenseExpiryDate',
        values.licenseExpiryDate
          ? values.licenseExpiryDate instanceof Date
            ? values.licenseExpiryDate
            : parseDate(values.licenseExpiryDate)
          : undefined,
        { shouldDirty: true },
      );
      if (providerData.identifier) {
        setValue('systemId', providerData.identifier, { shouldDirty: true });
      }
    },
    [setValue, attributeTypeMapping],
  );

  const handleProviderSelected = useCallback(
    (providerData: ProviderSearchResult) => {
      setPersonValuesFromProvider(providerData);
      setProviderValuesFromProvider(providerData);
    },
    [setPersonValuesFromProvider, setProviderValuesFromProvider],
  );

  return (
    <div className={styles.leftContainer}>
      <div>
        <div className={styles.leftLayout}>
          <ProgressIndicator
            currentIndex={currentIndex}
            spaceEqually={true}
            vertical={true}
            className={styles.progressIndicator}
            onChange={handleStepChange}>
            {steps.map((step, index) => (
              <ProgressStep
                key={step.id}
                label={step.label}
                className={styles.ProgresStep}
                disabled={!isStepEnabled(index)}
              />
            ))}
          </ProgressIndicator>
          <div className={styles.sections}>
            <FormProvider {...userFormMethods}>
              <form onSubmit={userFormMethods.handleSubmit(onSubmit, handleError)} className={styles.form}>
                <div className={styles.formContainer}>
                  <Stack className={styles.formStackControl} gap={7}>
                    {hasDemographicInfo && (
                      <DemographicSection
                        control={userFormMethods.control}
                        errors={errors}
                        isInitialValuesEmpty={isInitialValuesEmpty}
                        onProviderSelected={handleProviderSelected}
                      />
                    )}
                    {hasProviderAccount && (
                      <ProviderSection
                        control={userFormMethods.control}
                        errors={errors}
                        isInitialValuesEmpty={isInitialValuesEmpty}
                        loadingProvider={initialProvider ? false : loadingProvider}
                        providerError={providerError}
                        provider={providerSource}
                      />
                    )}
                    {hasLoginInfo && (
                      <LoginSection
                        control={userFormMethods.control}
                        errors={errors}
                        isInitialValuesEmpty={isInitialValuesEmpty}
                        watch={userFormMethods.watch}
                      />
                    )}
                    {hasRoles && (
                      <RolesSection
                        control={userFormMethods.control}
                        roles={roles}
                        rolesConfig={rolesConfig || []}
                        isLoading={isLoading}
                      />
                    )}
                  </Stack>
                </div>
                <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
                  <Button kind="secondary" onClick={handleBackClick} className={styles.btn}>
                    {t(hasDemographicInfo ? 'cancel' : 'back', hasDemographicInfo ? 'Cancel' : 'Back')}
                  </Button>
                  <Button
                    kind="primary"
                    type={getSubmitButtonType()}
                    disabled={isSubmitting || Object.keys(errors).length > 0}
                    renderIcon={getSubmitButtonIcon()}
                    className={styles.btn}
                    onClick={handleNextWithValidation}>
                    {isSubmitting ? (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {t('submitting', 'Submitting...')} <InlineLoading status="active" />
                      </span>
                    ) : (
                      getSubmitButtonText()
                    )}
                  </Button>
                </ButtonSet>
              </form>
            </FormProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageUserWorkspace;
