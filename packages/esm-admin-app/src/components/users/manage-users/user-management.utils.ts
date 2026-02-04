import type { ProviderWithAttributes } from '../../../user-management.resources';
import { EXCLUDED_ROLE_CATEGORY } from './user-management.constants';

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
