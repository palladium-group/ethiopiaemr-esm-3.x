import type { ProviderWithAttributes } from '../../../user-management.resources';
import { EXCLUDED_ROLE_CATEGORY } from './user-management.constants';

export interface ProviderWithAttributesMinimal {
  attributes?: Array<{ attributeType?: { uuid: string }; value?: string | { name?: string } }>;
  identifier?: string;
}

export interface AttributeTypeMappingForExtraction {
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

export interface ProviderFormValues {
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

export interface NameParts {
  givenName: string;
  middleName: string;
  familyName: string;
}

export function extractNameParts(display = ''): NameParts {
  const nameParts = display.split(' ');
  const [givenName = '', middleName = '', familyName = ''] =
    nameParts.length === 3 ? nameParts : [nameParts[0], '', nameParts[1] || ''];
  return { givenName, middleName, familyName };
}

export function extractAttributeFromProvider(providerData: ProviderWithAttributes, attributeTypeUuid: string): string {
  const attr = providerData.attributes?.find((a) => a.attributeType?.uuid === attributeTypeUuid);
  if (!attr?.value) {
    return '';
  }
  return typeof attr.value === 'string' ? attr.value : attr.value?.name ?? '';
}

export function extractProviderFormValues(
  provider: ProviderWithAttributesMinimal | ProviderWithAttributes,
  attributeTypeMapping: AttributeTypeMappingForExtraction,
): ProviderFormValues {
  const getVal = (uuid: string) => extractAttributeFromProvider(provider as ProviderWithAttributes, uuid);
  const licenseExpiryVal = getVal(attributeTypeMapping.licenseExpiry);
  return {
    providerLicenseNumber: getVal(attributeTypeMapping.licenseNumber),
    licenseExpiryDate: licenseExpiryVal ? new Date(licenseExpiryVal) : '',
    qualification: getVal(attributeTypeMapping.qualification),
    nationalId: getVal(attributeTypeMapping.providerNationalId),
    passportNumber: getVal(attributeTypeMapping.passportNumber),
    registrationNumber: getVal(attributeTypeMapping.licenseBody),
    phoneNumber: getVal(attributeTypeMapping.phoneNumber),
    email: getVal(attributeTypeMapping.providerAddress),
    providerUniqueIdentifier: getVal(attributeTypeMapping.providerUniqueIdentifier),
  };
}

export interface RoleConfigCategory {
  category: string;
  roles: string[];
}

export function filterRolesConfig(
  rolesConfig: RoleConfigCategory[],
  excludeCategory = EXCLUDED_ROLE_CATEGORY,
): RoleConfigCategory[] {
  return rolesConfig.filter((category) => category.category !== excludeCategory);
}
