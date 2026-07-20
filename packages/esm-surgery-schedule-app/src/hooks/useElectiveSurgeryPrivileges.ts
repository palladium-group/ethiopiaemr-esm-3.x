import { useMemo } from 'react';
import { userHasAccess, useConfig, useSession } from '@openmrs/esm-framework';
import type { SurgeryScheduleConfig } from '../config-schema';

export function useElectiveSurgeryPrivileges() {
  const config = useConfig<SurgeryScheduleConfig>();
  const session = useSession();
  const user = session?.user;
  const { manageSchedulePrivilege, recordContactPrivilege, removePatientPrivilege, viewSchedulePrivilege } = config;

  return useMemo(
    () => ({
      canViewSchedule: userHasAccess(viewSchedulePrivilege, user),
      canRecordContact: userHasAccess(recordContactPrivilege, user),
      canManageSchedule: userHasAccess(manageSchedulePrivilege, user),
      canRemovePatient: userHasAccess(removePatientPrivilege, user),
    }),
    [manageSchedulePrivilege, recordContactPrivilege, removePatientPrivilege, user, viewSchedulePrivilege],
  );
}
