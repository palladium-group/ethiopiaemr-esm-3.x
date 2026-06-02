import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { SideNav, SideNavItems, SideNavMenu, SideNavMenuItem, SideNavLink, InlineLoading } from '@carbon/react';
import { useGroupedReports } from '../api/reports.resource';
import styles from './reports-left-nav.component.scss';

const ReportsLeftNav: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { groupedReports, isLoading, error } = useGroupedReports();

  const currentUuid = location.pathname.replace(/^\//, '');

  const categories = Object.keys(groupedReports);
  const hasAnyReport = categories.some((c) => (groupedReports[c]?.length ?? 0) > 0);

  return (
    <SideNav
      isFixedNav
      expanded
      isChildOfHeader={false}
      aria-label={t('ethiopiaEmrReports', 'EthiopiaEMR Reports')}
      className={styles.sideNav}>
      <SideNavItems>
        <h4 className={styles.heading}>{t('reports', 'Reports')}</h4>

        {isLoading && (
          <div className={styles.status}>
            <InlineLoading description={t('loading', 'Loading…')} />
          </div>
        )}

        {error && <div className={styles.status}>{t('errorLoadingReports', 'Could not load the report list.')}</div>}

        {!isLoading &&
          !error &&
          categories.map((category) => {
            const reports = groupedReports[category] ?? [];
            if (reports.length === 0) {
              return null;
            }
            // Expand the group that contains the currently selected report (default: first).
            const containsActive = reports.some((r) => r.uuid === currentUuid);
            return (
              <SideNavMenu
                key={category}
                title={category}
                defaultExpanded={containsActive || category === categories[0]}>
                {reports.map((report) => (
                  <SideNavMenuItem
                    key={report.uuid}
                    isActive={report.uuid === currentUuid}
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      navigate(`/${report.uuid}`);
                    }}>
                    {report.name}
                  </SideNavMenuItem>
                ))}
              </SideNavMenu>
            );
          })}

        {!isLoading && !error && !hasAnyReport && (
          <SideNavLink href="#" onClick={(e: React.MouseEvent) => e.preventDefault()}>
            {t('noRows', 'No rows.')}
          </SideNavLink>
        )}
      </SideNavItems>
    </SideNav>
  );
};

export default ReportsLeftNav;
