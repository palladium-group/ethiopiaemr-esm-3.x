import React from 'react';
import { WorkspaceContainer } from '@openmrs/esm-framework';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { APPOINTMENT_SERVICE_ADMIN_CONTEXT_KEY, appointmentServiceAdminBasePath } from '../constants';
import AppointmentServiceAdminDashboard from './dashboard.component';
import styles from './home.scss';

const AppointmentServiceAdminHome: React.FC = () => {
  return (
    <BrowserRouter basename={appointmentServiceAdminBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<AppointmentServiceAdminDashboard />} />
          <Route path="/*" element={<AppointmentServiceAdminDashboard />} />
        </Routes>
      </main>
      <WorkspaceContainer
        key={APPOINTMENT_SERVICE_ADMIN_CONTEXT_KEY}
        contextKey={APPOINTMENT_SERVICE_ADMIN_CONTEXT_KEY}
      />
    </BrowserRouter>
  );
};

export default AppointmentServiceAdminHome;
