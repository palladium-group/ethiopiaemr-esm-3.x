import React from 'react';
import { useLeftNav, WorkspaceContainer } from '@openmrs/esm-framework';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { autoClaimsAdminBasePath } from '../constants';
import AutoClaimsDashboardContainer from '../claims/auto-claims/dashboard/auto-claims-dashboard-container.component';

import styles from './home.scss';

const AutoClaimsAdminHome: React.FC = () => {
  useLeftNav({ name: 'auto-claims-admin-dashboard-slot', basePath: autoClaimsAdminBasePath });

  return (
    <BrowserRouter basename={autoClaimsAdminBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<AutoClaimsDashboardContainer />} />
          <Route path="/:dashboard/*" element={<AutoClaimsDashboardContainer />} />
        </Routes>
      </main>
      <WorkspaceContainer key="claims-admin" contextKey="claims-admin" />
    </BrowserRouter>
  );
};

export default AutoClaimsAdminHome;
