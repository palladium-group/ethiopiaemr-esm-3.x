import React from 'react';
import { useTranslation } from 'react-i18next';
import AppointmentServicesTable from './appointment-services-table.component';
import styles from './home.scss';

const AppointmentServiceAdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.dashboard}>
      <h4>{t('appointmentServiceAdmin', 'Appointment service admin')}</h4>
      <AppointmentServicesTable />
    </div>
  );
};

export default AppointmentServiceAdminDashboard;
