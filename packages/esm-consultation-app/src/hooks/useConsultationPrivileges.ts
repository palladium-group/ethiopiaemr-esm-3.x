import { useMemo } from 'react';
import { userHasAccess, useConfig, useSession } from '@openmrs/esm-framework';
import type { ConsultationConfig } from '../config-schema';

export function useConsultationPrivileges() {
  const config = useConfig<ConsultationConfig>();
  const session = useSession();
  const user = session?.user;
  const { requestConsultationPrivilege, respondConsultationPrivilege, viewConsultationPrivilege } = config;

  return useMemo(
    () => ({
      canViewConsultations: userHasAccess(viewConsultationPrivilege, user),
      canRequestConsultation: userHasAccess(requestConsultationPrivilege, user),
      canRespondToConsultation: userHasAccess(respondConsultationPrivilege, user),
    }),
    [requestConsultationPrivilege, respondConsultationPrivilege, user, viewConsultationPrivilege],
  );
}
