import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { navigate, userHasAccess, useSession } from '@openmrs/esm-framework';
import ShrAdmin from './components/shr-admin.component';
import { ShrPermissions } from './permissions.constants';
import styles from './root.scss';

const Root: React.FC = () => {
  const spaBasePath = `${window.getOpenmrsSpaBase()}shr-admin`;
  const session = useSession();

  useEffect(() => {
    if (session?.authenticated && !userHasAccess(ShrPermissions.ManageOutbox, session?.user)) {
      navigate({ to: `${window.getOpenmrsSpaBase()}home` });
    }
  }, [session]);

  if (!session?.authenticated) {
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
