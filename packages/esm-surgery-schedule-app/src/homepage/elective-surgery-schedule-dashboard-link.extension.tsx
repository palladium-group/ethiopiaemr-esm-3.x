import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigurableLink } from '@openmrs/esm-framework';
import { shallowEqual } from '@openmrs/esm-utils';
import useSWR from 'swr';
import { fetchNearDeadlineCount, getNearDeadlineSwrKey } from '../api/elective-surgery-schedule.resource';
import { ELECTIVE_SURGERY_SCHEDULE_PATH, spaBasePath } from '../constants';
import { useElectiveSurgeryPrivileges } from '../hooks/useElectiveSurgeryPrivileges';
import styles from '../schedule-badge.scss';

function ElectiveSurgeryScheduleDashboardLinkInner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { canViewSchedule } = useElectiveSurgeryPrivileges();
  const { data: nearDeadlineCount } = useSWR(canViewSchedule ? getNearDeadlineSwrKey() : null, fetchNearDeadlineCount);

  const isActive = useMemo(() => {
    const path = ELECTIVE_SURGERY_SCHEDULE_PATH;
    const paths = path.split('/').map((segment) => decodeURIComponent(segment));
    const localPath = (location.pathname ?? '')
      .split('/')
      .slice(-1 * paths.length)
      .map((segment) => decodeURIComponent(segment));

    return shallowEqual(paths, localPath);
  }, [location.pathname]);

  if (!canViewSchedule) {
    return null;
  }

  const badgeCount = nearDeadlineCount && nearDeadlineCount > 0 ? nearDeadlineCount : 0;

  return (
    <div>
      <ConfigurableLink
        className={classNames('cds--side-nav__link', { 'active-left-nav-link': isActive })}
        to={`${spaBasePath}/${encodeURIComponent(ELECTIVE_SURGERY_SCHEDULE_PATH)}`}>
        <span className={styles.menu}>
          <span>{t('electiveSurgerySchedule', 'Elective Surgery Schedule')}</span>
          {badgeCount > 0 ? <span className={styles.badge}>{badgeCount}</span> : null}
        </span>
      </ConfigurableLink>
    </div>
  );
}

export default function ElectiveSurgeryScheduleDashboardLink() {
  return (
    <BrowserRouter>
      <ElectiveSurgeryScheduleDashboardLinkInner />
    </BrowserRouter>
  );
}
