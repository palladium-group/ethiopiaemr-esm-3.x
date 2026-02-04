import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefaultWorkspaceProps, useLayoutType, useConfig, parseDate } from '@openmrs/esm-framework';
import { FormProvider } from 'react-hook-form';
import styles from './user-management.workspace.scss';
import { ButtonSet, Button, InlineLoading, Stack, ProgressIndicator, ProgressStep } from '@carbon/react';
import classNames from 'classnames';
import { useRoles, useProvider, useProviderAttributeType } from '../../../user-management.resources';
import { useSystemUserRoleConfigSetting } from '../../hook/useSystemRoleSetting';
import { User } from '../../../types';
import { ConfigObject } from '../../../config-schema';
import { useUsers } from './user-list/user-list.resource';
import { type ProviderSearchResult } from './provider-search.resource';
import { extractNameParts, extractAttributeFromProvider } from './user-management.utils';
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
};

const ManageUserWorkspace: React.FC<ManageUserWorkspaceProps> = ({
  closeWorkspace,
  promptBeforeClosing,
  closeWorkspaceWithSavedChanges,
  initialUserValue = {} as User,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const [selectedProvider, setSelectedProvider] = useState<ProviderSearchResult | null>(null);

  const { provider = [], loadingProvider, providerError } = useProvider(initialUserValue.systemId);
  const { users } = useUsers();
  const usernames =
    users?.map((user) => user.username).filter((username) => username !== initialUserValue?.username) || [];
  const isInitialValuesEmpty = Object.keys(initialUserValue).length === 0;

  const { providerAttributeType = [] } = useProviderAttributeType();
  const { roles = [], isLoading } = useRoles();
  const { rolesConfig } = useSystemUserRoleConfigSetting();
  const config = useConfig<ConfigObject>();

  const { attributeTypeMapping, providerValues } = useProviderAttributeMapping({
    provider,
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

  const {
    steps,
    currentIndex,
    hasDemographicInfo,
    hasLoginInfo,
    hasProviderAccount,
    hasRoles,
    handleBackClick,
    handleNextClick,
    handleStepChange,
    getSubmitButtonText,
    getSubmitButtonType,
    getSubmitButtonIcon,
  } = useUserFormSteps({ t, closeWorkspace });

  const handleNextWithValidation = useCallback(
    async (e: React.MouseEvent) => {
      if (hasDemographicInfo) {
        const isValid = await trigger(['givenName', 'familyName', 'gender']);
        if (!isValid) {
          return;
        }
      }
      handleNextClick(e);
    },
    [hasDemographicInfo, trigger, handleNextClick],
  );

  const { onSubmit, handleError } = useUserFormSubmission({
    attributeTypeMapping,
    selectedProvider,
    initialUserValue,
    provider,
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
      setValue(
        'providerUniqueIdentifier',
        extractAttributeFromProvider(providerData, attributeTypeMapping.providerUniqueIdentifier),
        { shouldDirty: true },
      );
      setValue('nationalId', extractAttributeFromProvider(providerData, attributeTypeMapping.providerNationalId), {
        shouldDirty: true,
      });
      setValue('passportNumber', extractAttributeFromProvider(providerData, attributeTypeMapping.passportNumber), {
        shouldDirty: true,
      });
      setValue('providerLicense', extractAttributeFromProvider(providerData, attributeTypeMapping.licenseNumber), {
        shouldDirty: true,
      });
      setValue('registrationNumber', extractAttributeFromProvider(providerData, attributeTypeMapping.licenseBody), {
        shouldDirty: true,
      });
      setValue('qualification', extractAttributeFromProvider(providerData, attributeTypeMapping.qualification), {
        shouldDirty: true,
      });
      const licenseExpiryStr = extractAttributeFromProvider(providerData, attributeTypeMapping.licenseExpiry);
      setValue('licenseExpiryDate', licenseExpiryStr ? parseDate(licenseExpiryStr) : undefined, {
        shouldDirty: true,
      });
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
            {steps.map((step) => (
              <ProgressStep key={step.id} label={step.label} className={styles.ProgresStep} />
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
                        loadingProvider={loadingProvider}
                        providerError={providerError}
                        provider={provider}
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
