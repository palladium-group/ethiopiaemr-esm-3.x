import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { navigate, userHasAccess, useSession } from '@openmrs/esm-framework';
import ShrAdmin from './components/shr-admin.component';
import { useShrAdminEnabled } from './api/use-shr-admin-enabled';
import { ShrPermissions } from './permissions.constants';
import styles from './root.scss';

const Root: React.FC = () => {
  const spaBasePath = `${window.getOpenmrsSpaBase()}shr-admin`;
  const session = useSession();
  const { isShrAdminEnabled, isLoading: isLoadingFeatureFlag } = useShrAdminEnabled();

  useEffect(() => {
    // Wait for the flag before deciding: it defaults to disabled while loading, so acting early
    // would bounce every user off the page for the moment it takes to read the setting.
    if (isLoadingFeatureFlag) {
      return;
    }

    if (!isShrAdminEnabled) {
      navigate({ to: `${window.getOpenmrsSpaBase()}home` });
      return;
    }

    if (session?.authenticated && !userHasAccess(ShrPermissions.ManageOutbox, session?.user)) {
      navigate({ to: `${window.getOpenmrsSpaBase()}home` });
    }
  }, [session, isShrAdminEnabled, isLoadingFeatureFlag]);

  if (!session?.authenticated || isLoadingFeatureFlag || !isShrAdminEnabled) {
    return null;
  }

  return (
    <BrowserRouter basename={spaBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<ShrAdmin />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
