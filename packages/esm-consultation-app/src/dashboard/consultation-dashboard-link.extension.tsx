import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigurableLink } from '@openmrs/esm-framework';
import { useConsultationsAwaitingReview } from '../hooks/useConsultationsAwaitingReview';
import badgeStyles from '../consultation-badge.scss';
import styles from './consultation-dashboard-link.scss';

const CONSULTATION_DASHBOARD_PATH = 'consultation';

function getPatientUuidFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/\/patient\/([a-f0-9-]+)\/chart/i);
  return match?.[1];
}

function ConsultationDashboardLinkInner() {
  const { t } = useTranslation();
  const location = useLocation();
  const patientUuid = getPatientUuidFromPathname(location.pathname);
  const { unreadCount } = useConsultationsAwaitingReview(patientUuid);
  const consultationPath = patientUuid
    ? `${window.getOpenmrsSpaBase()}patient/${patientUuid}/chart/${CONSULTATION_DASHBOARD_PATH}`
    : null;

  const isActive = useMemo(() => {
    if (!patientUuid) {
      return false;
    }

    return location.pathname.includes(`/patient/${patientUuid}/chart/${CONSULTATION_DASHBOARD_PATH}`);
  }, [location.pathname, patientUuid]);

  if (!consultationPath) {
    return null;
  }

  return (
    <div>
      <ConfigurableLink
        className={classNames('cds--side-nav__link', { 'active-left-nav-link': isActive })}
        to={consultationPath}>
        <span className={badgeStyles.menu}>
          <span>{t('consultation', 'Consultation')}</span>
          {unreadCount > 0 ? <span className={badgeStyles.badge}>{unreadCount}</span> : null}
        </span>
      </ConfigurableLink>
    </div>
  );
}

export default function ConsultationDashboardLink() {
  return (
    <BrowserRouter>
      <ConsultationDashboardLinkInner />
    </BrowserRouter>
  );
}
