import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigurableLink, MaybeIcon } from '@openmrs/esm-framework';
import { shallowEqual } from '@openmrs/esm-utils';
import { useConsultationsAwaitingReview } from '../hooks/useConsultationsAwaitingReview';
import { useConsultationPrivileges } from '../hooks/useConsultationPrivileges';
import badgeStyles from '../consultation-badge.scss';
import styles from './consultation-dashboard-link.scss';

const CONSULTATION_DASHBOARD_PATH = 'consultation';
const CONSULTATION_DASHBOARD_ICON = 'omrs-icon-sticky-note-add';

function getPatientUuidFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/\/patient\/([a-f0-9-]+)\/chart/i);
  return match?.[1];
}

function isPatientChartContext(pathname: string, basePath?: string): boolean {
  if (getPatientUuidFromPathname(pathname)) {
    return true;
  }

  return Boolean(basePath?.includes('/patient/') && basePath.includes('/chart'));
}

export function resolvePatientChartBasePath(basePath: string | undefined, pathname: string): string | undefined {
  if (basePath?.includes('/patient/') && basePath.includes('/chart')) {
    return basePath;
  }

  const patientUuid = getPatientUuidFromPathname(pathname);
  if (!patientUuid) {
    return undefined;
  }

  return `${window.getOpenmrsSpaBase()}patient/${patientUuid}/chart`;
}

function ConsultationDashboardLinkInner({ basePath }: { basePath?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const patientUuid = getPatientUuidFromPathname(location.pathname);
  const resolvedBasePath = resolvePatientChartBasePath(basePath, location.pathname);
  const { unreadCount } = useConsultationsAwaitingReview(patientUuid);
  const { canViewConsultations } = useConsultationPrivileges();

  const isActive = useMemo(() => {
    const paths = CONSULTATION_DASHBOARD_PATH.split('/').map((segment) => decodeURIComponent(segment));
    const localPath = (location.pathname ?? '')
      .split('/')
      .slice(-1 * paths.length)
      .map((segment) => decodeURIComponent(segment));

    return shallowEqual(paths, localPath);
  }, [location.pathname]);

  if (!isPatientChartContext(location.pathname, basePath) || !canViewConsultations || !resolvedBasePath) {
    return null;
  }

  return (
    <div>
      <ConfigurableLink
        className={classNames('cds--side-nav__link', { 'active-left-nav-link': isActive })}
        to={`${resolvedBasePath}/${encodeURIComponent(CONSULTATION_DASHBOARD_PATH)}`}>
        <span className={styles.menu}>
          <MaybeIcon icon={CONSULTATION_DASHBOARD_ICON} className={styles.icon} size={16} />
          <span className={styles.title}>
            <span>{t('consultation', 'Consultation')}</span>
            {unreadCount > 0 ? <span className={badgeStyles.badge}>{unreadCount}</span> : null}
          </span>
        </span>
      </ConfigurableLink>
    </div>
  );
}

export default function ConsultationDashboardLink({ basePath }: { basePath?: string }) {
  return (
    <BrowserRouter>
      <ConsultationDashboardLinkInner basePath={basePath} />
    </BrowserRouter>
  );
}
