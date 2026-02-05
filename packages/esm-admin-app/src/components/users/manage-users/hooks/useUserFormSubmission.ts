import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import type { TFunction } from 'i18next';
import {
  createUser,
  handleMutation,
  createProvider,
  type ProviderWithAttributes,
} from '../../../../user-management.resources';
import { createProviderAttribute, updateProviderAttributes } from '../../../modal/hwr-sync.resource';
import { Provider, User } from '../../../../types';
import type { ProviderSearchResult } from '../provider-search.resource';
import type { AttributeTypeMapping, ProviderValues } from './useProviderAttributeMapping';
import type { FieldErrors } from 'react-hook-form';
import type { UserFormSchema } from './useUserManagementForm';
import { extractNameParts } from '../user-management.utils';
interface UseUserFormSubmissionParams {
  attributeTypeMapping: AttributeTypeMapping;
  selectedProvider: ProviderSearchResult | null;
  initialUserValue: User;
  provider: ProviderWithAttributes[];
  providerValues: ProviderValues;
  isProviderReadOnly: boolean;
  isInitialValuesEmpty: boolean;
  personPhonenumberAttributeUuid: string;
  personEmailAttributeUuid: string;
  licenseBodyUuid: string;
  providerNationalIdUuid: string;
  licenseNumberUuid: string;
  passportNumberUuid: string;
  providerUniqueIdentifierAttributeTypeUuid: string;
  closeWorkspaceWithSavedChanges: () => void;
  t: TFunction;
}

export function useUserFormSubmission({
  attributeTypeMapping,
  selectedProvider,
  initialUserValue,
  provider,
  providerValues,
  isProviderReadOnly,
  isInitialValuesEmpty,
  personPhonenumberAttributeUuid,
  personEmailAttributeUuid,
  licenseBodyUuid,
  providerNationalIdUuid,
  licenseNumberUuid,
  passportNumberUuid,
  providerUniqueIdentifierAttributeTypeUuid,
  closeWorkspaceWithSavedChanges,
  t,
}: UseUserFormSubmissionParams) {
  const showSnackbarMessage = (title: string, subtitle: string, kind: 'success' | 'error') => {
    showSnackbar({ title, subtitle, kind, isLowContrast: true });
  };

  const sanitizeFormData = (data: UserFormSchema): UserFormSchema => {
    const sanitized = { ...data };

    if (isProviderReadOnly) {
      const display = selectedProvider?.person?.display ?? initialUserValue?.person?.display ?? '';
      const { givenName, middleName, familyName } = extractNameParts(display);
      const gender = (selectedProvider?.person?.gender ?? initialUserValue?.person?.gender) as 'M' | 'F' | undefined;

      Object.assign(sanitized, {
        givenName,
        middleName,
        familyName,
        gender,
        phoneNumber: providerValues.phoneNumber,
        email: providerValues.email,
        providerUniqueIdentifier: providerValues.providerUniqueIdentifier,
        nationalId: providerValues.nationalId,
        passportNumber: providerValues.passportNumber,
        providerLicense: providerValues.providerLicenseNumber,
        registrationNumber: providerValues.registrationNumber,
        qualification: providerValues.qualification,
        licenseExpiryDate: providerValues.licenseExpiryDate
          ? providerValues.licenseExpiryDate instanceof Date
            ? providerValues.licenseExpiryDate
            : new Date(providerValues.licenseExpiryDate)
          : undefined,
        systemId: provider[0]?.identifier ?? '',
      });
    } else {
      if (isInitialValuesEmpty && provider.length > 0) {
        sanitized.phoneNumber = providerValues.phoneNumber;
        sanitized.email = providerValues.email;
      } else if (isInitialValuesEmpty && provider.length === 0) {
        sanitized.phoneNumber = '';
        sanitized.email = '';
      } else if (!isInitialValuesEmpty && !data.isEditProvider && provider.length > 0) {
        sanitized.nationalId = providerValues.nationalId;
        sanitized.passportNumber = providerValues.passportNumber;
        sanitized.providerLicense = providerValues.providerLicenseNumber;
        sanitized.registrationNumber = providerValues.registrationNumber;
        sanitized.providerUniqueIdentifier = providerValues.providerUniqueIdentifier;
      }
    }

    return sanitized;
  };

  const onSubmit = async (data: UserFormSchema) => {
    const sanitizedData = sanitizeFormData(data);
    const setProvider = sanitizedData.providerIdentifiers;
    const editProvider = sanitizedData.isEditProvider;
    const providerUUID = provider[0]?.uuid || '';

    const providerPayload: Partial<Provider> = {
      attributes: [
        { attributeType: attributeTypeMapping.licenseNumber, value: sanitizedData.providerLicense },
        {
          attributeType: attributeTypeMapping.licenseExpiry,
          value: sanitizedData.licenseExpiryDate ? sanitizedData.licenseExpiryDate.toISOString() : '',
        },
        { attributeType: attributeTypeMapping.licenseBody, value: sanitizedData.registrationNumber },
        {
          attributeType: attributeTypeMapping.providerUniqueIdentifier,
          value: sanitizedData.providerUniqueIdentifier,
        },
        {
          attributeType: attributeTypeMapping.providerNationalId,
          value: sanitizedData.nationalId,
        },
        {
          attributeType: attributeTypeMapping.qualification,
          value: sanitizedData.qualification,
        },
        {
          attributeType: attributeTypeMapping.passportNumber,
          value: sanitizedData.passportNumber,
        },
        {
          attributeType: attributeTypeMapping.phoneNumber,
          value: sanitizedData.phoneNumber,
        },
        {
          attributeType: attributeTypeMapping.providerAddress,
          value: sanitizedData.email,
        },
      ].filter((attr) => attr.value),
    };

    const includePassword =
      isInitialValuesEmpty || (sanitizedData.password && sanitizedData.password.trim().length > 0);

    const payload: Partial<User> = {
      username: sanitizedData.username,
      ...(includePassword ? { password: sanitizedData.password } : {}),
      person: selectedProvider?.person?.uuid
        ? { uuid: selectedProvider.person.uuid, gender: selectedProvider.person.gender ?? '' }
        : {
            uuid: initialUserValue?.person?.uuid,
            names: [
              {
                givenName: sanitizedData.givenName,
                familyName: sanitizedData.familyName,
                middleName: sanitizedData.middleName,
              },
            ],
            gender: sanitizedData.gender,
            attributes: [
              { attributeType: personPhonenumberAttributeUuid, value: sanitizedData.phoneNumber },
              { attributeType: personEmailAttributeUuid, value: sanitizedData.email },
            ],
          },
      roles: sanitizedData.roles?.map((role) => ({
        uuid: role.uuid,
        name: role.display,
        description: role.description ?? '',
      })),
    };

    try {
      const response = await createUser(payload, initialUserValue?.uuid || '');
      if (response.uuid) {
        showSnackbarMessage(t('userSaved', 'User saved successfully'), '', 'success');

        handleMutation(
          `${restBaseUrl}/user?v=custom:(uuid,username,display,systemId,retired,person:(uuid,display,gender,names:(givenName,familyName,middleName),attributes:(uuid,display)),roles:(uuid,description,display,name))`,
        );

        if (setProvider) {
          try {
            const providerUrl = providerUUID ? `${restBaseUrl}/provider/${providerUUID}` : `${restBaseUrl}/provider`;
            const personUUID = response.person.uuid;
            const identifier = response.systemId;
            const providerResponse = await createProvider(personUUID, identifier, providerPayload, providerUrl);
            if (providerResponse.ok) {
              showSnackbarMessage(t('providerSaved', 'Provider saved successfully'), '', 'success');
            }
          } catch (error) {
            showSnackbarMessage(
              t('providerFail', 'Failed to save provider'),
              t('providerFailedSubtitle', 'An error occurred while creating provider'),
              'error',
            );
          }
        }
        if (editProvider) {
          const updatableAttributes = [
            { attributeType: licenseBodyUuid, value: sanitizedData?.registrationNumber },
            { attributeType: providerNationalIdUuid, value: sanitizedData?.nationalId },
            { attributeType: licenseNumberUuid, value: sanitizedData?.providerLicense },
            { attributeType: passportNumberUuid, value: sanitizedData?.passportNumber },
            {
              attributeType: providerUniqueIdentifierAttributeTypeUuid,
              value: sanitizedData?.providerUniqueIdentifier,
            },
          ].filter((attr) => attr?.value !== undefined && attr?.value !== null && attr?.value !== '');

          await Promise.all(
            updatableAttributes?.map((attr) => {
              const existingAttributes = provider[0]?.attributes?.find(
                (at) => at?.attributeType?.uuid === attr?.attributeType,
              )?.uuid;

              const attrPayload = {
                attributeType: attr?.attributeType,
                value: attr?.value,
              };

              if (!existingAttributes) {
                return createProviderAttribute(attrPayload, providerUUID);
              }
              return updateProviderAttributes(attrPayload, providerUUID, existingAttributes);
            }),
          );
          showSnackbar({
            title: 'Success',
            kind: 'success',
            subtitle: t('updateMessage', 'Provider updated successfully'),
          });
        }
      } else {
        throw new Error('User creation failed');
      }
      handleMutation(`${restBaseUrl}/user`);
      mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/provider`));
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbarMessage(
        t('userSaveFailed', 'Failed to save user'),
        t('userCreationFailedSubtitle', 'An error occurred while saving user form '),
        'error',
      );
    }
  };

  const handleError = (errors: FieldErrors<UserFormSchema>) => {
    showSnackbar({
      title: t('userSaveFailed', 'Fail to save'),
      subtitle: t('userCreationFailedSubtitle', 'An error occurred while saving user form', {
        errorMessage: JSON.stringify(errors, null, 2),
      }),
      kind: 'error',
      isLowContrast: true,
    });
  };

  return { onSubmit, handleError };
}
