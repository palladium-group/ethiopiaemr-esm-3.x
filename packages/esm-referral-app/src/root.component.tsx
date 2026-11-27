import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { navigate, userHasAccess, useSession } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { syncReferralQueue } from './api/referral.resource';
import { useReferralEnabled } from './api/use-referral-enabled';
import { ReferralPermissions } from './permissions.constants';
import ReferralLayout from './components/layout/referral-layout.component';
import ReferralList from './components/list/referral-list.component';
import ReferralDetail from './components/detail/referral-detail.component';
import ReferralForm from './components/form/referral-form.component';
import CatchmentPage from './components/catchment/catchment.component';
import Dashboard from './components/dashboard/dashboard.component';
import styles from './root.scss';

const Root: React.FC = () => {
  const spaBasePath = `${window.getOpenmrsSpaBase()}referral`;
  const session = useSession();
  const { isReferralEnabled, isLoading: isLoadingFlag } = useReferralEnabled();

  useEffect(() => {
    // The flag reads as disabled while loading; deciding early would bounce everyone off the page.
    if (isLoadingFlag) {
      return;
    }
    if (!isReferralEnabled) {
      navigate({ to: `${window.getOpenmrsSpaBase()}home` });
      return;
    }
    if (session?.authenticated && !userHasAccess(ReferralPermissions.ManageReferrals, session?.user)) {
      navigate({ to: `${window.getOpenmrsSpaBase()}home` });
    }
  }, [session, isReferralEnabled, isLoadingFlag]);

  useEffect(() => {
    if (!session?.authenticated || isLoadingFlag || !isReferralEnabled) {
      return;
    }
    if (!userHasAccess(ReferralPermissions.ManageReferrals, session.user)) {
      return;
    }
    let cancelled = false;
    syncReferralQueue()
      .then((summary) => {
        if (cancelled || !summary.applied) {
          return;
        }
        mutate((key) => typeof key === 'string' && key.includes('ethiopiaemrreferral'));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session, isReferralEnabled, isLoadingFlag]);

  if (!session?.authenticated || isLoadingFlag || !isReferralEnabled) {
    return null;
  }

  const canManageCatchment = userHasAccess(ReferralPermissions.ManageCatchment, session?.user);

  return (
    <BrowserRouter basename={spaBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route element={<ReferralLayout canManageCatchment={canManageCatchment} />}>
            <Route path="/" element={<Navigate to="/incoming" replace />} />
            <Route path="/incoming" element={<ReferralList direction="INCOMING" />} />
            <Route path="/outgoing" element={<ReferralList direction="OUTGOING" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {canManageCatchment && <Route path="/catchment" element={<CatchmentPage />} />}
          </Route>
          <Route path="/new" element={<ReferralForm />} />
          <Route path="/:uuid/edit" element={<ReferralForm />} />
          <Route path="/:uuid" element={<ReferralDetail />} />
          <Route path="*" element={<Navigate to="/incoming" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
