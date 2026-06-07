import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './home.scss';

const AppointmentServiceAdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.dashboard}>
      <p>{t('appointmentServiceAdminComingSoon', 'Appointment service availability configuration coming soon.')}</p>
    </div>
  );
};

export default AppointmentServiceAdminDashboard;
