import React from 'react';
import { useLeftNav, WorkspaceContainer } from '@openmrs/esm-framework';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { serviceAvailableBasePath } from '../constants';
import DashboardContainer from './dashboard/dashboard-container.component';

import styles from './home.scss';
import ServiceAvailableDashboardContainer from './dashboard/service-available-dashboard-container.component';

const ServicesAvailableAdminHome: React.FC = () => {
  useLeftNav({ name: 'services-available-admin-dashboard-slot', basePath: serviceAvailableBasePath });

  return (
    <BrowserRouter basename={serviceAvailableBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<ServiceAvailableDashboardContainer />} />
          <Route path="/:dashboard/*" element={<ServiceAvailableDashboardContainer />} />
        </Routes>
      </main>
      <WorkspaceContainer key="service-available-admin" contextKey="service-available-admin" />
    </BrowserRouter>
  );
};

export default ServicesAvailableAdminHome;
