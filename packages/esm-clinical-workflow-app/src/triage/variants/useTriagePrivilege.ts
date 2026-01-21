import { useSession } from '@openmrs/esm-framework';
import type { TriageVariantConfig } from '../../config-schema';

export const useTriagePrivilege = (variantConfig: TriageVariantConfig | undefined): boolean => {
  const session = useSession();

  if (!variantConfig || !variantConfig.privilege) {
    return false;
  }

  const userPrivileges = session?.user?.privileges || [];
  const requiredPrivilege = variantConfig.privilege;

  return userPrivileges.some(
    (privilege: any) => privilege.name === requiredPrivilege || privilege.display === requiredPrivilege,
  );
};
