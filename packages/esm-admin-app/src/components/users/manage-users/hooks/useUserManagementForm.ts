import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import UserManagementFormSchema from '../../userManagementFormSchema';
import { extractNameParts } from '../user-management.utils';
import type { User } from '../../../../types';
import type { ProviderValues } from './useProviderAttributeMapping';

export type UserFormSchema = {
  givenName: string;
  middleName?: string;
  familyName: string;
  gender?: 'M' | 'F';
  phoneNumber?: string;
  email?: string;
  providerIdentifiers?: boolean;
  username: string;
  password?: string;
  confirmPassword?: string;
  roles?: Array<{ uuid: string; display: string; description?: string | null }>;
  primaryRole?: string;
  systemId?: string;
  providerLicense?: string;
  licenseExpiryDate?: Date;
  registrationNumber?: string;
  qualification?: string;
  nationalId?: string;
  passportNumber?: string;
  isEditProvider?: boolean;
  providerUniqueIdentifier?: string;
};

interface UseUserManagementFormParams {
  initialUserValue: User;
  usernames: string[];
  providerValues: ProviderValues;
  loadingProvider: boolean;
  isInitialValuesEmpty: boolean;
  isProviderReadOnly?: boolean;
}

export function useUserManagementForm({
  initialUserValue,
  usernames,
  providerValues,
  loadingProvider,
  isInitialValuesEmpty,
  isProviderReadOnly = false,
}: UseUserManagementFormParams) {
  const { userManagementFormSchema } = UserManagementFormSchema(
    usernames,
    undefined,
    !isProviderReadOnly,
    isInitialValuesEmpty,
  );

  const formDefaultValues = useMemo(() => {
    if (isInitialValuesEmpty) {
      return {};
    }
    const { givenName, middleName, familyName } = extractNameParts(initialUserValue.person?.display || '');
    return {
      ...initialUserValue,
      givenName,
      middleName,
      familyName,
      phoneNumber: providerValues.phoneNumber,
      email: providerValues.email,
      roles:
        initialUserValue.roles?.map((role) => ({
          uuid: role.uuid,
          display: role.display,
          description: role.description,
        })) || [],
      gender: initialUserValue.person?.gender,
      providerLicense: providerValues.providerLicenseNumber,
      licenseExpiryDate: providerValues.licenseExpiryDate
        ? new Date(providerValues.licenseExpiryDate as Date)
        : undefined,
      qualification: providerValues.qualification,
      nationalId: providerValues.nationalId,
      passportNumber: providerValues.passportNumber,
      registrationNumber: providerValues.registrationNumber,
      providerUniqueIdentifier: providerValues.providerUniqueIdentifier,
    };
  }, [
    isInitialValuesEmpty,
    initialUserValue,
    providerValues.phoneNumber,
    providerValues.email,
    providerValues.providerLicenseNumber,
    providerValues.licenseExpiryDate,
    providerValues.qualification,
    providerValues.nationalId,
    providerValues.passportNumber,
    providerValues.registrationNumber,
    providerValues.providerUniqueIdentifier,
  ]);

  const userFormMethods = useForm<UserFormSchema>({
    resolver: zodResolver(userManagementFormSchema),
    mode: 'all',
    defaultValues: formDefaultValues,
  });

  const { reset } = userFormMethods;
  const { errors, isSubmitting, isDirty } = userFormMethods.formState;

  useEffect(() => {
    if (!loadingProvider && !isInitialValuesEmpty) {
      reset(formDefaultValues);
    }
  }, [loadingProvider, formDefaultValues, isInitialValuesEmpty, reset]);

  return {
    userFormMethods,
    formDefaultValues,
    errors,
    isSubmitting,
    isDirty,
  };
}
