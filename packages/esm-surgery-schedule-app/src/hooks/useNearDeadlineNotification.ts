import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { fetchNearDeadlineCount, getNearDeadlineSwrKey } from '../api/elective-surgery-schedule.resource';
import { NEAR_DEADLINE_NOTIFICATION_SESSION_KEY } from '../constants';
import { useElectiveSurgeryPrivileges } from './useElectiveSurgeryPrivileges';

export function useNearDeadlineNotification() {
  const { t } = useTranslation();
  const { canRecordContact } = useElectiveSurgeryPrivileges();

  const { data: count } = useSWR(canRecordContact ? getNearDeadlineSwrKey() : null, fetchNearDeadlineCount, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (!canRecordContact || !count || count <= 0) {
      return;
    }

    if (sessionStorage.getItem(NEAR_DEADLINE_NOTIFICATION_SESSION_KEY)) {
      return;
    }

    sessionStorage.setItem(NEAR_DEADLINE_NOTIFICATION_SESSION_KEY, 'true');

    showSnackbar({
      title: t('nearDeadlineNotificationTitle', 'Elective surgery deadline'),
      kind: 'warning',
      subtitle: t('nearDeadlineNotification', '{{count}} elective surgery patients nearing category deadline', {
        count,
      }),
      isLowContrast: true,
    });
  }, [canRecordContact, count, t]);
}
