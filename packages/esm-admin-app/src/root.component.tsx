import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { navigate, setLeftNav, unsetLeftNav, userHasAccess, useSession } from '@openmrs/esm-framework';
import styles from './root.scss';
import LeftPanel from './components/side-menu/left-pannel.component';
import UserManagentLandingPage from './components/users/manage-users/manage-user.component';
import FacilitySetup from './components/facility-setup/facility-setup.component';
import HomeComponent from './components/locations/home/home-locations.component';
import { AdminPermissions } from './permissions.constants';

const Root: React.FC = () => {
  const spaBasePath = window.spaBase;
  const adminBasename = window.getOpenmrsSpaBase() + 'admin';
  const session = useSession();

  useEffect(() => {
    setLeftNav({
      name: 'admin-left-panel-slot',
      basePath: spaBasePath,
    });
    return () => unsetLeftNav('admin-left-panel-slot');
  }, [spaBasePath]);

  useEffect(() => {
    if (session?.authenticated && !userHasAccess(AdminPermissions.ManageUsers, session?.user)) {
      navigate({ to: `${window.getOpenmrsSpaBase()}home` });
    }
  }, [session]);

  if (!session?.authenticated) {
    return null;
  }

  return (
    <BrowserRouter basename={adminBasename}>
      <LeftPanel />
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<UserManagentLandingPage />} />
          <Route path="/user-management" element={<UserManagentLandingPage />} />
          <Route path="/facility-setup" element={<FacilitySetup />} />
          <Route path="/locations" element={<HomeComponent />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
