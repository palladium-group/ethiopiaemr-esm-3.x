import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigurableLink } from '@openmrs/esm-framework';
import { shallowEqual } from '@openmrs/esm-utils';
import { useConsultationsInbox } from '../hooks/useConsultationsInbox';
import { CONSULTATION_INBOX_PATH, spaBasePath } from '../constants';
import styles from '../consultation-badge.scss';

function ConsultationInboxDashboardLinkInner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { consultations, sessionLocationUuid } = useConsultationsInbox();
  const pendingCount = sessionLocationUuid ? consultations?.length ?? 0 : 0;

  const isActive = useMemo(() => {
    const path = CONSULTATION_INBOX_PATH;
    const paths = path.split('/').map((segment) => decodeURIComponent(segment));
    const localPath = (location.pathname ?? '')
      .split('/')
      .slice(-1 * paths.length)
      .map((segment) => decodeURIComponent(segment));

    return shallowEqual(paths, localPath);
  }, [location.pathname]);

  return (
    <div>
      <ConfigurableLink
        className={classNames('cds--side-nav__link', { 'active-left-nav-link': isActive })}
        to={`${spaBasePath}/${encodeURIComponent(CONSULTATION_INBOX_PATH)}`}>
        <span className={styles.menu}>
          <span>{t('consultation', 'Consultation')}</span>
          {pendingCount > 0 ? <span className={styles.badge}>{pendingCount}</span> : null}
        </span>
      </ConfigurableLink>
    </div>
  );
}

export default function ConsultationInboxDashboardLink() {
  return (
    <BrowserRouter>
      <ConsultationInboxDashboardLinkInner />
    </BrowserRouter>
  );
}
