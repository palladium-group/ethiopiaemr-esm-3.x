import { ROLE_CATEGORIES } from '../../../constants';

export const FORM_STEP_IDS = ['demographic', 'login', 'provider', 'roles'] as const;

export const FORM_STEP_KEYS: Record<(typeof FORM_STEP_IDS)[number], { key: string; fallback: string }> = {
  demographic: { key: 'demographicInformation', fallback: 'Demographic Info' },
  login: { key: 'loginInformation', fallback: 'Login Info' },
  provider: { key: 'providerAccount', fallback: 'Provider Account' },
  roles: { key: 'roles', fallback: 'Roles Info' },
};

export const UPDATABLE_PROVIDER_ATTRIBUTE_KEYS = [
  'licenseBody',
  'providerNationalId',
  'licenseNumber',
  'passportNumber',
  'providerUniqueIdentifier',
] as const;

export const EXCLUDED_ROLE_CATEGORY = ROLE_CATEGORIES.CORE_INVENTORY;
