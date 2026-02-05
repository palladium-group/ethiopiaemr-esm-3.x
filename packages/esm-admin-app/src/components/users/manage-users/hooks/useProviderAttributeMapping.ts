import { useCallback, useMemo } from 'react';
import type { AttributeType } from '../../../../types';
import type { ConfigObject } from '../../../../config-schema';
import { extractProviderFormValues } from '../user-management.utils';

export interface AttributeTypeMapping {
  licenseNumber: string;
  licenseExpiry: string;
  providerNationalId: string;
  qualification: string;
  licenseBody: string;
  phoneNumber: string;
  providerAddress: string;
  passportNumber: string;
  providerUniqueIdentifier: string;
}

export interface ProviderValues {
  providerLicenseNumber: string;
  licenseExpiryDate: Date | string;
  qualification: string;
  nationalId: string;
  passportNumber: string;
  registrationNumber: string;
  phoneNumber: string;
  email: string;
  providerUniqueIdentifier: string;
}

interface UseProviderAttributeMappingParams {
  provider: Array<{ attributes?: Array<{ attributeType?: { uuid: string }; value?: string | { name?: string } }> }>;
  providerAttributeType: AttributeType[];
  config: Pick<
    ConfigObject,
    | 'licenseNumberUuid'
    | 'licenseExpiryDateUuid'
    | 'providerNationalIdUuid'
    | 'qualificationUuid'
    | 'licenseBodyUuid'
    | 'phoneNumberUuid'
    | 'providerAddressUuid'
    | 'passportNumberUuid'
    | 'providerUniqueIdentifierAttributeTypeUuid'
  >;
}

export function useProviderAttributeMapping({
  provider,
  providerAttributeType,
  config,
}: UseProviderAttributeMappingParams) {
  const attributeTypeMapping = useMemo<AttributeTypeMapping>(() => {
    return {
      licenseNumber: providerAttributeType.find((type) => type.uuid === config.licenseNumberUuid)?.uuid || '',
      licenseExpiry: providerAttributeType.find((type) => type.uuid === config.licenseExpiryDateUuid)?.uuid || '',
      providerNationalId: providerAttributeType.find((type) => type.uuid === config.providerNationalIdUuid)?.uuid || '',
      qualification: providerAttributeType.find((type) => type.uuid === config.qualificationUuid)?.uuid || '',
      licenseBody: providerAttributeType.find((type) => type.uuid === config.licenseBodyUuid)?.uuid || '',
      phoneNumber: providerAttributeType.find((type) => type.uuid === config.phoneNumberUuid)?.uuid || '',
      providerAddress: providerAttributeType.find((type) => type.uuid === config.providerAddressUuid)?.uuid || '',
      passportNumber: providerAttributeType.find((type) => type.uuid === config.passportNumberUuid)?.uuid || '',
      providerUniqueIdentifier:
        providerAttributeType.find((type) => type.uuid === config.providerUniqueIdentifierAttributeTypeUuid)?.uuid ||
        '',
    };
  }, [
    providerAttributeType,
    config.licenseNumberUuid,
    config.licenseExpiryDateUuid,
    config.providerNationalIdUuid,
    config.qualificationUuid,
    config.licenseBodyUuid,
    config.phoneNumberUuid,
    config.providerAddressUuid,
    config.passportNumberUuid,
    config.providerUniqueIdentifierAttributeTypeUuid,
  ]);

  const providerAttributes = useMemo(() => provider.flatMap((item) => item.attributes || []), [provider]);

  const getProviderAttributeValue = useCallback(
    (uuid: string, key: 'value' | 'display' = 'value') =>
      providerAttributes.find((attr) => attr.attributeType?.uuid === uuid)?.[key],
    [providerAttributes],
  );

  const providerValues = useMemo<ProviderValues>(() => {
    const firstProvider = provider[0];
    if (!firstProvider) {
      return {
        providerLicenseNumber: '',
        licenseExpiryDate: '',
        qualification: '',
        nationalId: '',
        passportNumber: '',
        registrationNumber: '',
        phoneNumber: '',
        email: '',
        providerUniqueIdentifier: '',
      };
    }
    return extractProviderFormValues(firstProvider, attributeTypeMapping);
  }, [provider, attributeTypeMapping]);

  return {
    attributeTypeMapping,
    getProviderAttributeValue,
    providerValues,
  };
}
