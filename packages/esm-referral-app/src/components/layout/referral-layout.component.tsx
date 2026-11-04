import React from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tab, TabList, Tabs } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import styles from './referral-layout.scss';

interface ReferralLayoutProps {
  canManageCatchment: boolean;
}

const ReferralLayout: React.FC<ReferralLayoutProps> = ({ canManageCatchment }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { path: '/incoming', label: t('incoming', 'Incoming') },
    { path: '/outgoing', label: t('outgoing', 'Outgoing') },
    { path: '/dashboard', label: t('dashboard', 'Dashboard') },
    ...(canManageCatchment ? [{ path: '/catchment', label: t('catchment', 'Catchment') }] : []),
  ];
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((tab) => pathname.startsWith(tab.path)),
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('referrals', 'Referrals')}</h2>
          <p className={styles.description}>
            {t(
              'referralsDescription',
              'Send patients to facilities in your catchment, respond to referrals sent to you, and close the loop with feedback.',
            )}
          </p>
        </div>
        <Button kind="primary" renderIcon={Add} onClick={() => navigate('/new')}>
          {t('newReferral', 'New referral')}
        </Button>
      </header>

      <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex: i }) => navigate(tabs[i].path)}>
        <TabList aria-label={t('referralSections', 'Referral sections')} contained={false}>
          {tabs.map((tab) => (
            <Tab key={tab.path}>{tab.label}</Tab>
          ))}
        </TabList>
      </Tabs>

      <section className={styles.content}>
        <Outlet />
      </section>
    </div>
  );
};

export default ReferralLayout;
