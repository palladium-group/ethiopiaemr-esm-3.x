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
import type { AttributeTypeMapping } from './useProviderAttributeMapping';
import type { FieldErrors } from 'react-hook-form';
import type { UserFormSchema } from './useUserManagementForm';

interface UseUserFormSubmissionParams {
  attributeTypeMapping: AttributeTypeMapping;
  selectedProvider: ProviderSearchResult | null;
  initialUserValue: User;
  provider: ProviderWithAttributes[];
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

  const onSubmit = async (data: UserFormSchema) => {
    const setProvider = data.providerIdentifiers;
    const editProvider = data.isEditProvider;
    const providerUUID = provider[0]?.uuid || '';

    const providerPayload: Partial<Provider> = {
      attributes: [
        { attributeType: attributeTypeMapping.licenseNumber, value: data.providerLicense },
        {
          attributeType: attributeTypeMapping.licenseExpiry,
          value: data.licenseExpiryDate ? data.licenseExpiryDate.toISOString() : '',
        },
        { attributeType: attributeTypeMapping.licenseBody, value: data.registrationNumber },
        {
          attributeType: attributeTypeMapping.providerUniqueIdentifier,
          value: data.providerUniqueIdentifier,
        },
        {
          attributeType: attributeTypeMapping.providerNationalId,
          value: data.nationalId,
        },
        {
          attributeType: attributeTypeMapping.qualification,
          value: data.qualification,
        },
        {
          attributeType: attributeTypeMapping.passportNumber,
          value: data.passportNumber,
        },
        {
          attributeType: attributeTypeMapping.phoneNumber,
          value: data.phoneNumber,
        },
        {
          attributeType: attributeTypeMapping.providerAddress,
          value: data.email,
        },
      ].filter((attr) => attr.value),
    };

    const payload: Partial<User> = {
      username: data.username,
      password: data.password,
      person: selectedProvider?.person?.uuid
        ? { uuid: selectedProvider.person.uuid, gender: selectedProvider.person.gender ?? '' }
        : {
            uuid: initialUserValue?.person?.uuid,
            names: [{ givenName: data.givenName, familyName: data.familyName, middleName: data.middleName }],
            gender: data.gender,
            attributes: [
              { attributeType: personPhonenumberAttributeUuid, value: data.phoneNumber },
              { attributeType: personEmailAttributeUuid, value: data.email },
            ],
          },
      roles: data.roles?.map((role) => ({
        uuid: role.uuid,
        name: role.display,
        description: role.description || '',
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
            { attributeType: licenseBodyUuid, value: data?.registrationNumber },
            { attributeType: providerNationalIdUuid, value: data?.nationalId },
            { attributeType: licenseNumberUuid, value: data?.providerLicense },
            { attributeType: passportNumberUuid, value: data?.passportNumber },
            {
              attributeType: providerUniqueIdentifierAttributeTypeUuid,
              value: data?.providerUniqueIdentifier,
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
