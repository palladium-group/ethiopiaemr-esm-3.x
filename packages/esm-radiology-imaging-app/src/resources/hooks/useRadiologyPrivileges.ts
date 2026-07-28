import { userHasAccess, useSession } from '@openmrs/esm-framework';
import { RADIOLOGY_PRIVILEGES } from '../../constants/radiology-privileges';

export function useRadiologyPrivileges() {
  const session = useSession();
  const user = session?.user;

  return {
    canStartExam: userHasAccess(RADIOLOGY_PRIVILEGES.START_EXAM, user),
    canAddPreliminaryReport: userHasAccess(RADIOLOGY_PRIVILEGES.ADD_PRELIMINARY_REPORT, user),
    canApproveReport: userHasAccess(RADIOLOGY_PRIVILEGES.APPROVE_REPORT, user),
    canViewImages: userHasAccess(RADIOLOGY_PRIVILEGES.VIEW_IMAGES, user),
    canScheduleAppointment: userHasAccess(RADIOLOGY_PRIVILEGES.SCHEDULE_APPOINTMENT, user),
  };
}
